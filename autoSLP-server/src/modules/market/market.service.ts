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
  const clean = symbol.replace('/', '').toUpperCase();
  if (clean === 'US30') return 'DJI';
  if (clean === 'SPX500') return 'SPX';
  if (clean === 'NAS100') return 'NDX';
  if (clean === 'XAUUSD') return 'XAU/USD';
  if (clean === 'XAGUSD') return 'XAG/USD';
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return symbol;
}

export const marketService = {
  getSupportedPairs: () => SUPPORTED_PAIRS,

  async getCandles(pair: string, timeframe: string, limit: number, from?: string, to?: string) {
    const cacheKey = `candles:${pair}:${timeframe}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && 'candles' in parsed) {
          return {
            candles: parsed.candles.map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp)
            })),
            isCached: parsed.isCached,
            apiError: parsed.apiError
          };
        } else if (Array.isArray(parsed)) {
          return {
            candles: parsed.map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp)
            })),
            isCached: false,
            apiError: null
          };
        }
      }
    } catch (cacheErr) {
      console.warn('Redis read error for candles:', cacheErr);
    }

    let candles;
    let apiError: string | null = null;
    try {
      if (isCrypto(pair)) {
        candles = await binance.fetchHistoricalCandles(pair, timeframe, limit);
      } else {
        candles = await twelveData.fetchHistoricalCandles(toForexSymbol(pair), timeframe, limit);
      }

      if (candles && candles.length > 0) {
        const resultObject = {
          candles,
          isCached: false,
          apiError: null
        };
        // Cache candles in Redis for 60 seconds (1 minute)
        try {
          await redis.setex(cacheKey, 60, JSON.stringify(resultObject));
        } catch (cacheErr) {
          console.warn('Redis write error for candles:', cacheErr);
        }

        // Run upsert async without blocking
        Promise.all(candles.map((c: any) => 
          prisma.candle.upsert({
            where:  { pair_timeframe_timestamp: { pair: c.pair, timeframe: c.timeframe, timestamp: c.timestamp } },
            update: { open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume },
            create: c,
          }).catch((err: any) => console.error('DB Insert Error', err))
        ));
        return resultObject;
      }
    } catch (err: any) {
      console.warn('Failed to fetch candles from API, falling back to DB proxy:', err);
      apiError = err?.message || 'Exchange/data provider temporarily unavailable';
    }

    const where: any = { pair, timeframe };
    if (from) where.timestamp = { ...where.timestamp, gte: new Date(from) };
    if (to)   where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const dbCandles = await prisma.candle.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take:    limit,
    });

    dbCandles.reverse();

    const resultObject = {
      candles: dbCandles,
      isCached: true,
      apiError: apiError || 'Market data feed is temporarily offline. Displaying cached fallback data.'
    };

    // Store in Redis briefly to prevent immediate re-triggering of failing APIs
    try {
      await redis.setex(cacheKey, 10, JSON.stringify(resultObject));
    } catch (cacheErr) {}

    return resultObject;
  },

  async getTicker(pair: string) {
    // Try Redis cache first (15s TTL)
    const cached = await redis.get(`ticker:${pair}`);
    if (cached) return JSON.parse(cached);

    const ticker = isCrypto(pair)
      ? await binance.fetchTicker(pair)
      : await twelveData.fetchTicker(toForexSymbol(pair));

    await redis.setex(`ticker:${pair}`, 15, JSON.stringify(ticker));
    return ticker;
  },

  async getAllTickers() {
    const cryptoPairs = SUPPORTED_PAIRS.crypto.map(p => p.symbol);
    const nonCryptoPairs = [
      ...SUPPORTED_PAIRS.forex.map(p => p.symbol),
      ...SUPPORTED_PAIRS.commodities.map(p => p.symbol),
    ];

    const results: any[] = [];
    const missingNonCrypto: string[] = [];

    // Fetch crypto tickers individually (Binance is free, fast, and has no strict limit)
    const cryptoPromises = cryptoPairs.map(async (p) => {
      try {
        const ticker = await marketService.getTicker(p);
        if (ticker) results.push(ticker);
      } catch (err) {
        console.error(`Error fetching crypto ticker ${p}:`, err);
      }
    });

    // Check Redis cache for non-crypto tickers
    const nonCryptoPromises = nonCryptoPairs.map(async (p) => {
      try {
        const cached = await redis.get(`ticker:${p}`);
        if (cached) {
          results.push(JSON.parse(cached));
        } else {
          missingNonCrypto.push(p);
        }
      } catch (err) {
        missingNonCrypto.push(p);
      }
    });

    await Promise.all([...cryptoPromises, ...nonCryptoPromises]);

    // If there are missing non-crypto tickers, fetch them as a single Twelve Data batch
    if (missingNonCrypto.length > 0) {
      try {
        const batchTickers = await twelveData.fetchTickersBatch(missingNonCrypto);
        for (const [cleanSymbol, ticker] of Object.entries(batchTickers)) {
          results.push(ticker);
          try {
            await redis.setex(`ticker:${cleanSymbol}`, 15, JSON.stringify(ticker));
          } catch (cacheErr) {
            console.warn('Redis cache write error in batch tickers:', cacheErr);
          }
        }
      } catch (err) {
        console.warn('Batch ticker fetch failed, falling back to individual fetching:', err);
        // Fallback to individual getTicker which handles simulation/Yahoo gracefully
        await Promise.all(missingNonCrypto.map(async (p) => {
          try {
            const ticker = await marketService.getTicker(p);
            if (ticker) results.push(ticker);
          } catch (individualErr) {
            console.error(`Failed individual ticker fallback for ${p}:`, individualErr);
          }
        }));
      }
    }

    // Sort the results to match the unified register's order
    const orderMap = new Map();
    const allPairs = [
      ...SUPPORTED_PAIRS.crypto.map(p => p.symbol),
      ...SUPPORTED_PAIRS.forex.map(p => p.symbol),
      ...SUPPORTED_PAIRS.commodities.map(p => p.symbol),
    ];
    allPairs.forEach((sym, idx) => orderMap.set(sym, idx));

    return results.sort((a, b) => (orderMap.get(a.symbol || a.pair) ?? 99) - (orderMap.get(b.symbol || b.pair) ?? 99));
  },

  async getBias(pair: string, timeframe: string) {
    // Check Redis cache (1 minute)
    const cacheKey = `bias:${pair}:${timeframe}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get recent candles for analysis
    const candlesResult = await marketService.getCandles(pair, timeframe, 200);
    const candles = candlesResult.candles;
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
