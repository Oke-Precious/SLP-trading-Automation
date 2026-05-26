import { prisma } from '../../shared/db.js';
import { redis } from '../../shared/redis.js';
import { analysisService } from '../analysis/analysis.service.js';
import { BinanceService } from './ingestion/binance.service.js';
import { TwelveDataService } from './ingestion/twelvedata.service.js';

const binance     = new BinanceService(prisma, redis);
const twelveData  = new TwelveDataService(prisma, redis);

// Unified pair registry
const SUPPORTED_PAIRS = {
  crypto: [
    { symbol: 'BTCUSDT',  name: 'Bitcoin',  base: 'BTC', quote: 'USDT', exchange: 'Binance', icon: '₿' },
    { symbol: 'ETHUSDT',  name: 'Ethereum', base: 'ETH', quote: 'USDT', exchange: 'Binance', icon: 'Ξ' },
    { symbol: 'SOLUSDT',  name: 'Solana',   base: 'SOL', quote: 'USDT', exchange: 'Binance', icon: '◎' },
    { symbol: 'BNBUSDT',  name: 'BNB',      base: 'BNB', quote: 'USDT', exchange: 'Binance', icon: 'B' },
    { symbol: 'XRPUSDT',  name: 'XRP',      base: 'XRP', quote: 'USDT', exchange: 'Binance', icon: 'X' },
    { symbol: 'ADAUSDT',  name: 'Cardano',  base: 'ADA', quote: 'USDT', exchange: 'Binance', icon: '₳' },
  ],
  forex: [
    { symbol: 'EURUSD',  name: 'Euro / Dollar',   base: 'EUR', quote: 'USD', exchange: 'Forex', icon: '€' },
    { symbol: 'GBPUSD',  name: 'Cable',           base: 'GBP', quote: 'USD', exchange: 'Forex', icon: '£' },
    { symbol: 'USDJPY',  name: 'Dollar / Yen',    base: 'USD', quote: 'JPY', exchange: 'Forex', icon: '¥' },
    { symbol: 'GBPJPY',  name: 'Pound / Yen',     base: 'GBP', quote: 'JPY', exchange: 'Forex', icon: '£¥' },
    { symbol: 'AUDUSD',  name: 'Aussie / Dollar', base: 'AUD', quote: 'USD', exchange: 'Forex', icon: 'A$' },
    { symbol: 'USDCAD',  name: 'Dollar / CAD',    base: 'USD', quote: 'CAD', exchange: 'Forex', icon: 'C$' },
    { symbol: 'EURJPY',  name: 'Euro / Yen',      base: 'EUR', quote: 'JPY', exchange: 'Forex', icon: '€¥' },
  ],
  commodities: [
    { symbol: 'XAUUSD', name: 'Gold',   base: 'XAU', quote: 'USD', exchange: 'Commodities', icon: '🥇' },
    { symbol: 'XAGUSD', name: 'Silver', base: 'XAG', quote: 'USD', exchange: 'Commodities', icon: '🥈' },
  ]
};

function isCrypto(symbol: string): boolean {
  return symbol.endsWith('USDT') || symbol.endsWith('BTC') || symbol.endsWith('ETH');
}

function toForexSymbol(symbol: string): string {
  // EURUSD → EUR/USD
  if (symbol.length === 6) return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  if (symbol === 'XAUUSD') return 'XAU/USD';
  if (symbol === 'XAGUSD') return 'XAG/USD';
  return symbol;
}

export const marketService = {
  getSupportedPairs: () => SUPPORTED_PAIRS,

  async getCandles(pair: string, timeframe: string, limit: number, from?: string, to?: string) {
    // First try to get from DB (for closed candles)
    const where: any = { pair, timeframe };
    if (from) where.timestamp = { ...where.timestamp, gte: new Date(from) };
    if (to)   where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const dbCandles = await prisma.candle.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take:    limit,
    });

    // If we have enough data, return from DB
    if (dbCandles.length >= Math.min(limit * 0.9, 100)) {
      return dbCandles;
    }

    // Otherwise fetch fresh and seed DB
    let candles;
    if (isCrypto(pair)) {
      candles = await binance.fetchHistoricalCandles(pair, timeframe, limit);
    } else {
      candles = await twelveData.fetchHistoricalCandles(toForexSymbol(pair), timeframe, limit);
    }

    // Upsert into DB
    for (const c of candles) {
      await prisma.candle.upsert({
        where:  { pair_timeframe_timestamp: { pair: c.pair, timeframe: c.timeframe, timestamp: c.timestamp } },
        update: { open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume },
        create: c,
      });
    }

    return candles;
  },

  async getTicker(pair: string) {
    // Try Redis cache first (5s TTL)
    const cached = await redis.get(`ticker:${pair}`);
    if (cached) return JSON.parse(cached);

    const ticker = isCrypto(pair)
      ? await binance.fetchTicker(pair)
      : await twelveData.fetchTicker(toForexSymbol(pair));

    await redis.setex(`ticker:${pair}`, 5, JSON.stringify(ticker));
    return ticker;
  },

  async getAllTickers() {
    const allPairs = [
      ...SUPPORTED_PAIRS.crypto.map(p => p.symbol),
      ...SUPPORTED_PAIRS.forex.map(p => p.symbol),
      ...SUPPORTED_PAIRS.commodities.map(p => p.symbol),
    ];
    const tickers = await Promise.allSettled(allPairs.map(p => marketService.getTicker(p)));
    return tickers
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value);
  },

  async getBias(pair: string, timeframe: string) {
    // Check Redis cache (1 minute)
    const cacheKey = `bias:${pair}:${timeframe}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get recent candles for analysis
    const candles = await marketService.getCandles(pair, timeframe, 200);
    if (candles.length < 20) return { bias: 'NEUTRAL', strength: 'WEAK', structure: 'Insufficient data' };

    const result = analysisService.calculateBias(candles, timeframe);

    // Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(result));

    // Persist to DB -> including required phase field
    await prisma.biasAnalysis.create({
      data: { 
        pair, 
        timeframe, 
        bias: result.bias,
        strength: result.strength,
        structure: result.structure,
        phase: (result as any).phase || 'CONSOLIDATION',
        lastHH: result.lastHH,
        lastHL: result.lastHL,
        analyzedAt: new Date() 
      }
    });

    return result;
  },

  async getAllBias() {
    const allPairs = [
      ...SUPPORTED_PAIRS.crypto.map(p => p.symbol),
      ...SUPPORTED_PAIRS.forex.map(p => p.symbol),
      ...SUPPORTED_PAIRS.commodities.map(p => p.symbol),
    ];
    const timeframes = ['1D', '4H', '1H'];
    const biasMap: Record<string, Record<string, any>> = {};

    for (const pair of allPairs) {
      biasMap[pair] = {};
      for (const tf of timeframes) {
        try {
          biasMap[pair][tf] = await marketService.getBias(pair, tf);
        } catch {
          biasMap[pair][tf] = { bias: 'NEUTRAL', strength: 'WEAK' };
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }
    return biasMap;
  }
};
