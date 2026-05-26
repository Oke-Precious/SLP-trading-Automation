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
  'XAU/USD': 2350.00,
  'XAG/USD': 29.50,
};

export class TwelveDataService {
  private prisma: PrismaClient;
  private redis: Redis;
  private apiKey: string;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.apiKey = process.env.TWELVE_DATA_KEY || '';
  }

  private hasValidKey(): boolean {
    return (
      !!this.apiKey && 
      !this.apiKey.includes('your') && 
      this.apiKey !== 'null' && 
      this.apiKey.trim() !== ''
    );
  }

  async fetchHistoricalCandles(symbol: string, timeframe: string, limit = 500) {
    const cleanSymbol = symbol.replace('/', '');
    const mappedInterval = timeframe === '1D' ? '1day' : timeframe.toLowerCase();

    if (!this.hasValidKey()) {
      logger.info(`TwelveData API key not set or invalid. Generating mock candles for ${symbol} (${timeframe})`);
      return this.generateSimulatedCandles(cleanSymbol, timeframe, limit);
    }

    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${mappedInterval}&outputsize=${limit}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TwelveData REST API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.values || !Array.isArray(data.values)) {
        logger.warn(`TwelveData returned invalid format or API limit hit: ${JSON.stringify(data)}. Falling back to simulation.`);
        return this.generateSimulatedCandles(cleanSymbol, timeframe, limit);
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
      logger.error(`Error in TwelveData fetchHistoricalCandles for ${symbol}: ${err.message}. Falling back to simulation.`);
      return this.generateSimulatedCandles(cleanSymbol, timeframe, limit);
    }
  }

  async fetchTicker(symbol: string) {
    const cleanSymbol = symbol.replace('/', '');
    const basePrice = DEFAULT_PRICES[symbol] || DEFAULT_PRICES[toForexFormat(symbol)] || 1.0;

    if (!this.hasValidKey()) {
      return this.generateSimulatedTicker(cleanSymbol, basePrice);
    }

    try {
      const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TwelveData REST API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.price) {
        return this.generateSimulatedTicker(cleanSymbol, basePrice);
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
      return this.generateSimulatedTicker(cleanSymbol, basePrice);
    }
  }

  private generateSimulatedCandles(pair: string, timeframe: string, limit: number) {
    const candles = [];
    const formattedSymbol = toForexFormat(pair);
    let currentPrice = DEFAULT_PRICES[formattedSymbol] || 1.0;
    
    // Time steps in milliseconds
    let stepMs = 60 * 60 * 1000; // default 1H
    if (timeframe === '1D') stepMs = 24 * 60 * 60 * 1000;
    else if (timeframe === '4H') stepMs = 4 * 60 * 60 * 1000;

    const baseTime = Date.now() - limit * stepMs;

    for (let i = 0; i < limit; i++) {
      const candleTime = new Date(baseTime + i * stepMs);
      const volatility = formattedSymbol.includes('JPY') || formattedSymbol.includes('XAU') ? 0.003 : 0.0012;
      
      const change = currentPrice * volatility * (Math.random() - 0.48); // Slight upward bias
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + currentPrice * volatility * 0.5 * Math.random();
      const low = Math.min(open, close) - currentPrice * volatility * 0.5 * Math.random();
      const volume = Math.floor(Math.random() * 8000 + 4000);

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
    const drift = (Math.random() - 0.5) * 0.002;
    const price = basePrice * (1 + drift);
    const change = price * 0.0008;
    const changePct = 0.08 + Math.random() * 0.15;
    return {
      pair,
      price,
      change,
      changePct: (Math.random() > 0.5 ? 1 : -1) * changePct,
      high24h: price * 1.006,
      low24h: price * 0.994,
      volume24h: 420000,
      quoteVol: 420000 * price,
    };
  }
}

function toForexFormat(pair: string): string {
  if (pair.includes('/')) return pair;
  if (pair.length === 6) {
    return `${pair.slice(0, 3)}/${pair.slice(3)}`;
  }
  return pair;
}
