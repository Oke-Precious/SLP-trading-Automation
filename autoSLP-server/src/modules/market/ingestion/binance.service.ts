import WebSocket from 'ws';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger';

const CRYPTO_PAIRS = [
  'btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt',
  'adausdt', 'dotusdt', 'linkusdt', 'avaxusdt', 'maticusdt'
];

const TIMEFRAMES = ['1d', '4h', '1h', '30m', '15m', '5m'];

// Maps Binance interval codes to our TF codes
const TF_MAP: Record<string, string> = {
  '1d': '1D', '4h': '4H', '1h': '1H', '30m': '30m', '15m': '15m', '5m': '5m'
};

export class BinanceService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isShuttingDown = false;
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
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

    this.ws.on('error', (err) => {
      logger.error('Binance WS error:', err.message);
    });

    this.ws.on('close', (code, reason) => {
      logger.warn(`Binance WS closed (${code}): ${reason}`);
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
    // Fetch historical candles via Binance REST (no key needed for public data)
    const interval = Object.entries(TF_MAP).find(([k, v]) => v === timeframe)?.[0] || '1d';
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance REST error: ${response.status}`);

    const data: any[] = await response.json();
    return data.map(k => ({
      pair,
      timeframe,
      open:      parseFloat(k[1]),
      high:      parseFloat(k[2]),
      low:       parseFloat(k[3]),
      close:     parseFloat(k[4]),
      volume:    parseFloat(k[5]),
      timestamp: new Date(k[0]),
    }));
  }

  async fetchTicker(pair: string) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ticker fetch failed for ${pair}`);
    const data = await res.json();
    return {
      pair:       data.symbol,
      price:      parseFloat(data.lastPrice),
      change:     parseFloat(data.priceChange),
      changePct:  parseFloat(data.priceChangePercent),
      high24h:    parseFloat(data.highPrice),
      low24h:     parseFloat(data.lowPrice),
      volume24h:  parseFloat(data.volume),
      quoteVol:   parseFloat(data.quoteVolume),
    };
  }

  shutdown() {
    this.isShuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    logger.info('Binance service shut down');
  }
}
