import WebSocket from 'ws';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger.js';
import ccxt from 'ccxt';

const CRYPTO_PAIRS = [
  'btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt',
  'adausdt', 'dotusdt', 'linkusdt', 'avaxusdt', 'maticusdt'
];

const TIMEFRAMES = [
  '1m', '3m', '5m', '15m', '30m', '45m',
  '1h', '2h', '4h', '8h', '12h',
  '1d', '1w', '1M'
];

// Maps Binance interval codes to our TF codes
const TF_MAP: Record<string, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '45m': '45m',
  '1h': '1H', '2h': '2H', '4h': '4H', '8h': '8H', '12h': '12H',
  '1d': '1D', '1w': '1W', '1M': '1M'
};

const DEFAULT_PRICES: Record<string, number> = {
  BTCUSDT: 67200,
  ETHUSDT: 3550,
  SOLUSDT: 168.50,
  BNBUSDT: 590,
  XRPUSDT: 0.525,
  ADAUSDT: 0.455,
  DOTUSDT: 7.15,
  LINKUSDT: 15.60,
  AVAXUSDT: 36.20,
  MATICUSDT: 0.72,
};

export class BinanceService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isShuttingDown = false;
  private prisma: PrismaClient;
  private redis: Redis;

  private exchanges: ccxt.Exchange[];

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;

    // Setup fallback exchanges via ccxt
    this.exchanges = [
      new ccxt.binance({ enableRateLimit: true }),
      new ccxt.bybit({ enableRateLimit: true }),
      new ccxt.okx({ enableRateLimit: true }),
    ];
  }

  buildStreamUrl(): string {
    // Build combined stream for all pairs × all timeframes
    const streams = CRYPTO_PAIRS.flatMap(pair =>
      TIMEFRAMES.map(tf => `${pair}@kline_${tf}`)
    ).join('/');
    return `wss://stream.binance.com:9443/stream?streams=${streams}`;
  }

  connect() {
    if (this.isShuttingDown) return;
    const url = this.buildStreamUrl();
    logger.info(`Connecting to Binance WebSocket (${CRYPTO_PAIRS.length} pairs × ${TIMEFRAMES.length} timeframes)`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      logger.info('✅ Binance WebSocket connected');
      this.reconnectDelay = 1000;
    });

    this.ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.handleMessage(msg);
      } catch (err) {
        logger.error('Error parsing Binance message:', err);
      }
    });

    this.ws.on('error', (err: any) => {
      logger.error('Binance WS error:', err.message);
    });

    this.ws.on('close', (code: number, reason: any) => {
      logger.debug(`Binance WS closed (${code}): ${reason}`);
      this.scheduleReconnect();
    });

    // Heartbeat: Binance expects pong every 3 minutes
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 180000);
  }

  private async handleMessage(msg: any) {
    if (!msg.data || msg.data.e !== 'kline') return;
    const k = msg.data.k;

    // Normalize candle
    const candle = {
      pair:      k.s,           // e.g., BTCUSDT
      timeframe: TF_MAP[k.i] || k.i,
      open:      parseFloat(k.o),
      high:      parseFloat(k.h),
      low:       parseFloat(k.l),
      close:     parseFloat(k.c),
      volume:    parseFloat(k.v),
      timestamp: new Date(k.t),
      isClosed:  k.x,           // true when candle is finalized
    };

    // Always publish live (open) candle for real-time chart updates
    await this.redis.publish('candle:live', JSON.stringify(candle));

    // Only save and analyze CLOSED candles
    if (candle.isClosed) {
      await this.saveCandle(candle);
      await this.redis.publish('candle:closed', JSON.stringify(candle));
      logger.debug(`Candle saved: ${candle.pair} ${candle.timeframe} @ ${candle.close}`);
    }
  }

  private async saveCandle(candle: any) {
    await this.prisma.candle.upsert({
      where: {
        pair_timeframe_timestamp: {
          pair:      candle.pair,
          timeframe: candle.timeframe,
          timestamp: candle.timestamp,
        }
      },
      update: {
        open:   candle.open,
        high:   candle.high,
        low:    candle.low,
        close:  candle.close,
        volume: candle.volume,
      },
      create: {
        pair:      candle.pair,
        timeframe: candle.timeframe,
        open:      candle.open,
        high:      candle.high,
        low:       candle.low,
        close:     candle.close,
        volume:    candle.volume,
        timestamp: candle.timestamp,
      }
    });
  }

  private scheduleReconnect() {
    if (this.isShuttingDown) return;
    logger.info(`Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  async fetchHistoricalCandles(pair: string, timeframe: string, limit = 500) {
    // Format pair for ccxt: BTCUSDT -> BTC/USDT
    const formattedPair = pair.length > 5 ? `${pair.slice(0, pair.length - 4)}/USDT` : pair;
    
    // Convert our timeframe code back to standard for CCXT if necessary
    let interval = Object.entries(TF_MAP).find(([k, v]) => v === timeframe)?.[0] || '1d';
    if (interval === '1w') interval = '1w'; // etc
    
    for (const exchange of this.exchanges) {
      try {
        if (!exchange.has['fetchOHLCV']) continue;
        
        const ohlcv = await exchange.fetchOHLCV(formattedPair, interval, undefined, limit);
        if (!ohlcv || ohlcv.length === 0) continue;

        return ohlcv.map((k: any) => ({
          pair,
          timeframe,
          open:      parseFloat(k[1]),
          high:      parseFloat(k[2]),
          low:       parseFloat(k[3]),
          close:     parseFloat(k[4]),
          volume:    parseFloat(k[5]),
          timestamp: new Date(k[0]),
        }));
      } catch (err: any) {
        logger.warn(`[CCXT] Failed to fetch candles for ${formattedPair} from ${exchange.id}: ${err.message}`);
        // try next exchange
      }
    }

    logger.error(`[CCXT] All exchanges failed for ${pair}, falling back to simulation.`);
    return this.generateSimulatedCandles(pair, timeframe, limit);
  }

  async fetchTicker(pair: string) {
    const formattedPair = pair.length > 5 ? `${pair.slice(0, pair.length - 4)}/USDT` : pair;

    for (const exchange of this.exchanges) {
      try {
        if (!exchange.has['fetchTicker']) continue;
        const ticker = await exchange.fetchTicker(formattedPair);
        if (!ticker) continue;

        return {
          pair,
          price:      ticker.last || 0,
          change:     ticker.change || 0,
          changePct:  ticker.percentage || 0,
          high24h:    ticker.high || 0,
          low24h:     ticker.low || 0,
          volume24h:  ticker.baseVolume || 0,
          quoteVol:   ticker.quoteVolume || 0,
        };
      } catch (err: any) {
        logger.warn(`[CCXT] Failed to fetch ticker for ${formattedPair} from ${exchange.id}: ${err.message}`);
      }
    }

    logger.error(`[CCXT] All exchanges failed for ticker ${pair}, falling back to simulation.`);
    const basePrice = DEFAULT_PRICES[pair.toUpperCase()] || 100.0;
    return this.generateSimulatedTicker(pair, basePrice);
  }

  private generateSimulatedCandles(pair: string, timeframe: string, limit: number) {
    const candles = [];
    const basePrice = DEFAULT_PRICES[pair.toUpperCase()] || 100.0;
    let currentPrice = basePrice;
    
    // Time steps in milliseconds
    let stepMs = 60 * 60 * 1000; // default 1H
    if (timeframe === '1D') stepMs = 24 * 60 * 60 * 1000;
    else if (timeframe === '4H') stepMs = 4 * 60 * 60 * 1000;
    else if (timeframe === '30m') stepMs = 30 * 60 * 1000;
    else if (timeframe === '15m') stepMs = 15 * 60 * 1000;
    else if (timeframe === '5m') stepMs = 5 * 60 * 1000;

    const baseTime = Date.now() - limit * stepMs;

    for (let i = 0; i < limit; i++) {
      const candleTime = new Date(baseTime + i * stepMs);
      const volatility = 0.008; // 0.8% volatility
      
      const change = currentPrice * volatility * (Math.random() - 0.48); // Slight upward/downward drift
      const open = currentPrice;
      const close = currentPrice + change;
      const jackpot = Math.random();
      const extraHigh = jackpot > 0.8 ? currentPrice * volatility : currentPrice * volatility * 0.3;
      const extraLow = jackpot > 0.8 ? currentPrice * volatility : currentPrice * volatility * 0.3;
      const high = Math.max(open, close) + extraHigh * Math.random();
      const low = Math.min(open, close) - extraLow * Math.random();
      const volume = Math.floor(Math.random() * 200000 + 50000);

      candles.push({
        pair,
        timeframe,
        open,
        high,
        low,
        close,
        volume,
        timestamp: candleTime,
      });

      currentPrice = close;
    }

    return candles;
  }

  private generateSimulatedTicker(pair: string, basePrice: number) {
    const drift = (Math.random() - 0.5) * 0.01;
    const price = basePrice * (1 + drift);
    const change = price * 0.005;
    const changePct = 0.5 + Math.random() * 1.5;
    return {
      pair,
      price,
      change,
      changePct: (Math.random() > 0.5 ? 1 : -1) * changePct,
      high24h: price * 1.015,
      low24h: price * 0.985,
      volume24h: 154000,
      quoteVol: 154000 * price,
    };
  }

  shutdown() {
    this.isShuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    logger.info('Binance service shut down');
  }
}
