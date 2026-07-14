import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { logger } from '../../../shared/utils/logger.js';

const DEFAULT_PRICES: Record<string, number> = {
  'EUR/USD': 1.0850,
  'GBP/USD': 1.2680,
  'USD/JPY': 156.40,
  'GBP/JPY': 198.50,
  'AUD/USD': 0.6650,
  'USD/CAD': 1.3650,
  'EUR/JPY': 169.50,
  'XAU/USD': 4032.69,
  'XAG/USD': 32.50,
};

export class TwelveDataService {
  private prisma: PrismaClient;
  private redis: Redis;
  private apiKey: string;
  private inMemoryCache = new Map<string, { data: any; expiry: number }>();

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.apiKey = (
      process.env.TWELVE_DATA_KEY ||
      process.env.VITE_TWELVE_DATA_KEY ||
      process.env.TWELVE_DATA_API_KEY ||
      process.env.TWELVEDATA_API_KEY ||
      process.env.TWELVEDATA_KEY ||
      process.env.NEXT_PUBLIC_TWELVE_DATA_KEY ||
      ''
    ).trim();

    // Run diagnostics check asynchronously after a 3 second delay to not block startup
    setTimeout(() => {
      this.runDiagnostics().catch(err => {
        logger.error(`[TwelveData Audit] Diagnostic run failed: ${err.message || err}`);
      });
    }, 3000);
  }

  private getFromMemoryCache(key: string): any {
    const item = this.inMemoryCache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.data;
    }
    return null;
  }

  private setInMemoryCache(key: string, data: any, ttlSeconds: number) {
    this.inMemoryCache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  async runDiagnostics() {
    logger.info('[TwelveData Audit] Starting Twelve Data API audit...');
    if (!this.hasValidKey()) {
      logger.info('[TwelveData Audit] No Twelve Data key found or key is invalid. Skipping live diagnostics (using Yahoo & simulations as standard).');
      return;
    }

    const testSymbols = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 
      'XAU/USD', 'XAG/USD', 
      'DJI', 'SPX', 'NDX'
    ];

    logger.info(`[TwelveData Audit] Testing ${testSymbols.length} assets against Twelve Data REST API using key: ${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`);

    for (const sym of testSymbols) {
      try {
        const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(sym)}&apikey=${this.apiKey}`;
        const res = await fetch(url);
        const status = res.status;
        const data = await res.json() as any;

        if (data.status === 'error' || data.error) {
          const errMsg = data.message || data.error;
          let category = 'Unknown Failure';
          if (errMsg.toLowerCase().includes('access') || errMsg.toLowerCase().includes('plan') || errMsg.toLowerCase().includes('subscribe')) {
            category = 'Subscription Restriction (Standard for Free Keys on indices/metals)';
          } else if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('credits') || status === 429) {
            category = 'Rate Limiting';
          } else if (errMsg.toLowerCase().includes('api key') || status === 401 || status === 403) {
            category = 'Invalid API Key';
          } else if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('symbol')) {
            category = 'Unsupported Symbol / Bad Format';
          }
          logger.warn(`[TwelveData Audit] ❌ ${sym} -> HTTP ${status} | Code: ${data.code || 'N/A'} | Category: ${category} | Message: "${errMsg}"`);
        } else if (data.price) {
          logger.info(`[TwelveData Audit]   ${sym} -> HTTP ${status} | Price: ${data.price} | Success!`);
        } else {
          logger.warn(`[TwelveData Audit] ⚠️ ${sym} -> HTTP ${status} | Unexpected response: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        logger.error(`[TwelveData Audit] 💥 ${sym} -> Exception: ${err.message || err}`);
      }
      // Wait 1 second between requests to respect rate limiting (8 req/min max)
      await new Promise(r => setTimeout(r, 1000));
    }
    logger.info('[TwelveData Audit] Twelve Data API audit completed.');
  }

  private hasValidKey(): boolean {
    return (
      !!this.apiKey && 
      !this.apiKey.includes('your') && 
      this.apiKey !== 'null' && 
      this.apiKey.trim() !== ''
    );
  }

  private async fetchYahooCandles(symbol: string, timeframe: string, limit = 500) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const yahooSymbol = getYahooSymbol(cleanSymbol);
    const { interval, range } = getYahooQueryParams(timeframe, limit);
    
    const queryInterval = timeframe === '4H' ? '1h' : interval;
    const queryLimit = timeframe === '4H' ? limit * 4 : limit;
    
    const urls = [
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${queryInterval}&range=${range}`,
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${queryInterval}&range=${range}`
    ];

    let lastError: any = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com/'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Yahoo Finance responded with status ${response.status}`);
        }
        
        const body = await response.json();
        const result = body?.chart?.result?.[0];
        if (!result) {
          throw new Error('Yahoo Finance returned no result data');
        }
        
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0];
        if (!quote || timestamps.length === 0) {
          throw new Error('Yahoo Finance indicators quote or timestamps is empty');
        }
        
        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i];
          const open = quote.open?.[i];
          const high = quote.high?.[i];
          const low = quote.low?.[i];
          const close = quote.close?.[i];
          const volume = quote.volume?.[i] || 0;
          
          if (open === null || open === undefined || close === null || close === undefined) {
            continue;
          }
          
          candles.push({
            pair: cleanSymbol,
            timeframe: queryInterval === '1h' && timeframe === '4H' ? '1H' : timeframe,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume),
            timestamp: new Date(timestamp * 1000),
          });
        }
        
        if (timeframe === '4H') {
          const aggregated = aggregateTo4H(candles);
          return aggregated.slice(-limit);
        }
        
        return candles.slice(-limit);
      } catch (err: any) {
        lastError = err;
        console.warn(`[Yahoo Finance Backup] Failed URL ${url}: ${err?.message || err}`);
      }
    }
    
    throw lastError || new Error('All Yahoo Finance servers failed');
  }

  private async fetchYahooTicker(symbol: string) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const yahooSymbol = getYahooSymbol(cleanSymbol);
    
    const urls = [
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`
    ];

    let lastError: any = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com/'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Yahoo ticker response error status ${response.status}`);
        }
        
        const body = await response.json();
        const result = body?.chart?.result?.[0];
        const meta = result?.meta;
        if (!meta) {
          throw new Error('No metadata returned from Yahoo ticker');
        }
        
        const price = parseFloat(meta.regularMarketPrice);
        const previousClose = parseFloat(meta.chartPreviousClose || meta.previousClose || price);
        const change = price - previousClose;
        const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        return {
          pair: cleanSymbol,
          price,
          change,
          changePct,
          high24h: meta.high || price * 1.006,
          low24h: meta.low || price * 0.994,
          volume24h: meta.regularMarketVolume || 420000,
          quoteVol: (meta.regularMarketVolume || 420000) * price,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Yahoo Ticker Backup] Failed URL ${url}: ${err?.message || err}`);
      }
    }
    
    throw lastError || new Error('All Yahoo Ticker servers failed');
  }

  async fetchHistoricalCandles(symbol: string, timeframe: string, limit = 500) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const cacheKey = `candles:${cleanSymbol}:${timeframe}:${limit}`;
    const cached = this.getFromMemoryCache(cacheKey);
    if (cached) {
      return cached;
    }

    const candles = await this.fetchHistoricalCandlesRaw(symbol, timeframe, limit);
    if (candles && candles.length > 0) {
      this.setInMemoryCache(cacheKey, candles, 60); // 60 seconds local memory caching
    }
    return candles;
  }

  private async fetchHistoricalCandlesRaw(symbol: string, timeframe: string, limit = 500) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const mappedInterval = timeframe === '1D' ? '1day' : timeframe.toLowerCase();

    // Preemptive routing for Indices: DJI/DJIA/US30, SPX/SPX500, NDX/NAS100
    const isIndex = ['DJI', 'SPX', 'NDX', 'US30', 'SPX500', 'NAS100'].includes(cleanSymbol);
    if (isIndex) {
      return await this.fetchYahooCandles(symbol, timeframe, limit);
    }

    // High accuracy live gold (XAUUSD) fallback using PAXGUSDT on Binance
    if (cleanSymbol === 'XAUUSD') {
      try {
        const binanceTf = timeframe.toLowerCase() === '1d' || timeframe.toUpperCase() === '1D' ? '1d' : timeframe.toLowerCase();
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${binanceTf}&limit=${limit}`;
        const response = await fetch(binanceUrl);
        if (response.ok) {
          const klines = await response.json();
          if (Array.isArray(klines) && klines.length > 0) {
            return klines.map((k: any) => ({
              pair: 'XAUUSD',
              timeframe,
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              timestamp: new Date(k[0]),
            }));
          }
        }
      } catch (err) {
        console.warn('[TwelveDataService] Binance PAXGUSDT historical candles fallback failed:', err);
      }
    }

    if (!this.hasValidKey()) {
      return await this.fetchYahooCandles(symbol, timeframe, limit);
    }

    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${mappedInterval}&outputsize=${limit}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          try {
            return await this.fetchYahooCandles(symbol, timeframe, limit);
          } catch (yahooErr) {
            throw new Error('Twelve Data API quota exhausted. Data temporarily unavailable, please try again shortly.');
          }
        }
        throw new Error(`TwelveData REST API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'error' || data.error || !data.values || !Array.isArray(data.values)) {
        const errMsg = String(data.message || data.error || '').toLowerCase();
        const isQuotaExhausted = errMsg.includes('quota') || errMsg.includes('credit') || errMsg.includes('limit') || errMsg.includes('plan') || errMsg.includes('subscribe');
        
        if (data.status === 'error' || data.error) {
          logger.warn(`[TwelveData REST] Error fetching candles for ${symbol}: "${data.message || data.error}" (falling back to Yahoo)`);
        }
        
        try {
          return await this.fetchYahooCandles(symbol, timeframe, limit);
        } catch (yahooErr) {
          if (isQuotaExhausted) {
            throw new Error('Twelve Data API quota exhausted. Data temporarily unavailable, please try again shortly.');
          }
          throw yahooErr;
        }
      }

      return data.values.map((v: any) => ({
        pair: cleanSymbol,
        timeframe,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume || '0'),
        timestamp: new Date(v.datetime),
      })).reverse(); // Reverse so they are ascending in chronological order
    } catch (err: any) {
      return await this.fetchYahooCandles(symbol, timeframe, limit);
    }
  }

  async fetchTicker(symbol: string) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const cacheKey = `ticker:${cleanSymbol}`;
    const cached = this.getFromMemoryCache(cacheKey);
    if (cached) {
      return cached;
    }

    const ticker = await this.fetchTickerRaw(symbol);
    if (ticker) {
      this.setInMemoryCache(cacheKey, ticker, 15); // 15 seconds local memory caching
    }
    return ticker;
  }

  private async fetchTickerRaw(symbol: string) {
    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const basePrice = DEFAULT_PRICES[symbol] || DEFAULT_PRICES[toForexFormat(symbol)] || 1.0;

    // Preemptive routing for Indices: DJI/DJIA/US30, SPX/SPX500, NDX/NAS100
    const isIndex = ['DJI', 'SPX', 'NDX', 'US30', 'SPX500', 'NAS100'].includes(cleanSymbol);
    if (isIndex) {
      return await this.fetchYahooTicker(symbol);
    }

    // High accuracy live gold (XAUUSD) fallback using PAXGUSDT on Binance
    if (cleanSymbol === 'XAUUSD') {
      try {
        const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT`;
        const response = await fetch(binanceUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            pair: 'XAUUSD',
            price: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChange),
            changePct: parseFloat(data.priceChangePercent),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            volume24h: parseFloat(data.volume),
            quoteVol: parseFloat(data.volume) * parseFloat(data.lastPrice),
          };
        }
      } catch (err) {
        console.warn('[TwelveDataService] Binance PAXGUSDT ticker fallback failed:', err);
      }
    }

    if (!this.hasValidKey()) {
      return await this.fetchYahooTicker(symbol);
    }

    try {
      const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TwelveData REST API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'error' || data.error || !data.price) {
        if (data.status === 'error' || data.error) {
          logger.warn(`[TwelveData REST] Error fetching ticker for ${symbol}: "${data.message || data.error}" (falling back to Yahoo)`);
        }
        return await this.fetchYahooTicker(symbol);
      }

      const price = parseFloat(data.price);
      return {
        pair: cleanSymbol,
        price,
        change: price * 0.0015,
        changePct: 0.15,
        high24h: price * 1.008,
        low24h: price * 0.993,
        volume24h: 350000,
        quoteVol: 350000 * price,
      };
    } catch {
      return await this.fetchYahooTicker(symbol);
    }
  }

  async fetchTickersBatch(symbols: string[]): Promise<Record<string, any>> {
    const formattedSymbols = symbols.map(s => toForexFormat(s));
    const csvSymbols = formattedSymbols.join(',');

    if (!this.hasValidKey()) {
      const fallbackResult: Record<string, any> = {};
      await Promise.all(symbols.map(async (sym) => {
        fallbackResult[sym.replace('/', '')] = await this.fetchTicker(sym);
      }));
      return fallbackResult;
    }

    try {
      const url = `https://api.twelvedata.com/quote?symbol=${csvSymbols}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TwelveData REST API batch quote error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'error' || data.code === 400 || data.code === 401 || data.code === 403 || data.code === 429) {
        throw new Error(data.message || 'Twelve Data batch request returned error status');
      }

      const parsedTickers: Record<string, any> = {};

      for (const rawSym of symbols) {
        const cleanSymbol = rawSym.replace('/', '');
        const formattedSym = toForexFormat(rawSym);
        
        const item = data[formattedSym] || data[cleanSymbol] || (data.symbol && (data.symbol === formattedSym || data.symbol === cleanSymbol) ? data : null);
        if (item && (item.close || item.price)) {
          const price = parseFloat(item.close || item.price || '0');
          parsedTickers[cleanSymbol] = {
            pair: cleanSymbol,
            price,
            change: parseFloat(item.change || '0'),
            changePct: parseFloat(item.percent_change || '0'),
            high24h: parseFloat(item.high || (price * 1.008).toString()),
            low24h: parseFloat(item.low || (price * 0.993).toString()),
            volume24h: parseFloat(item.volume || '100000'),
            quoteVol: parseFloat(item.volume || '100000') * price,
          };
        } else {
          parsedTickers[cleanSymbol] = await this.fetchTicker(rawSym);
        }
      }

      return parsedTickers;
    } catch (err: any) {
      const fallbackResult: Record<string, any> = {};
      await Promise.all(symbols.map(async (sym) => {
        fallbackResult[sym.replace('/', '')] = await this.fetchTicker(sym);
      }));
      return fallbackResult;
    }
  }

}

function toForexFormat(pair: string): string {
  const clean = pair.replace('/', '').toUpperCase();
  if (clean === 'US30') return 'DJI';
  if (clean === 'SPX500') return 'SPX';
  if (clean === 'NAS100') return 'NDX';
  if (clean === 'XAUUSD') return 'XAU/USD';
  if (clean === 'XAGUSD') return 'XAG/USD';
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return pair;
}

function getYahooSymbol(symbol: string): string {
  const s = symbol.replace('/', '').toUpperCase();
  if (s === 'XAUUSD') return 'XAU-USD';
  if (s === 'XAGUSD') return 'SI=F';
  if (s === 'US30') return '^DJI';
  if (s === 'SPX500') return '^GSPC';
  if (s === 'NAS100') return '^IXIC';
  return `${s}=X`;
}

function getYahooQueryParams(timeframe: string, limit: number): { interval: string; range: string } {
  const tf = timeframe.toUpperCase();
  
  if (tf === '1M' || tf === '1MIN') return { interval: '1m', range: '5d' };
  if (tf === '5M' || tf === '5MIN') return { interval: '5m', range: '5d' };
  if (tf === '15M' || tf === '15MIN') return { interval: '15m', range: '14d' };
  if (tf === '30M' || tf === '30MIN') return { interval: '30m', range: '30d' };
  if (tf === '1H' || tf === '60MIN') return { interval: '1h', range: '60d' };
  if (tf === '4H') return { interval: '1h', range: '120d' };
  if (tf === '1D' || tf === '1DAY' || tf === 'DAILY') return { interval: '1d', range: '2y' };
  return { interval: '1d', range: '2y' };
}

function aggregateTo4H(candles1h: any[]): any[] {
  const aggregated: any[] = [];
  let currentBlock: any = null;
  
  for (const candle of candles1h) {
    const timestamp = new Date(candle.timestamp || candle.time * 1000);
    const hour = timestamp.getUTCHours();
    const blockStartHour = Math.floor(hour / 4) * 4;
    
    const blockDate = new Date(timestamp);
    blockDate.setUTCHours(blockStartHour, 0, 0, 0);
    const blockTime = blockDate.getTime();
    
    if (!currentBlock || currentBlock.id !== blockTime) {
      if (currentBlock) {
        aggregated.push({
          pair: currentBlock.pair,
          timeframe: '4H',
          open: currentBlock.open,
          high: currentBlock.high,
          low: currentBlock.low,
          close: currentBlock.close,
          volume: currentBlock.volume,
          timestamp: new Date(currentBlock.id)
        });
      }
      currentBlock = {
        id: blockTime,
        pair: candle.pair,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      };
    } else {
      currentBlock.high = Math.max(currentBlock.high, candle.high);
      currentBlock.low = Math.min(currentBlock.low, candle.low);
      currentBlock.close = candle.close;
      currentBlock.volume += candle.volume;
    }
  }
  
  if (currentBlock) {
    aggregated.push({
      pair: currentBlock.pair,
      timeframe: '4H',
      open: currentBlock.open,
      high: currentBlock.high,
      low: currentBlock.low,
      close: currentBlock.close,
      volume: currentBlock.volume,
      timestamp: new Date(currentBlock.id)
    });
  }
  
  return aggregated;
}
