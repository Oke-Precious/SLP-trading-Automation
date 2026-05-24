/**
 * @file market.ts
 * @description API module for market candles and ticker states.
 */

import { apiClient } from './client';
import { Candle, Ticker } from '../../types/market';
import { CurrencyPair, Timeframe } from '../../types';

export const marketApi = {
  getHistoricalCandles: async (pair: CurrencyPair, timeframe: Timeframe): Promise<Candle[]> => {
    try {
      const response = await apiClient.get<Candle[]>(`/market/candles`, {
        params: { pair, timeframe },
      });
      return response.data;
    } catch {
      // Fallback for demo preview
      const prices = { BTCUSDT: 62000, ETHUSDT: 3100, EURUSD: 1.085, GBPUSD: 1.254 };
      const basePrice = prices[pair] || 100;
      return Array.from({ length: 100 }, (_, i) => {
        const time = Math.floor(Date.now() / 1000) - (100 - i) * 14400;
        const offset = (Math.sin(i / 5) + Math.cos(i / 10)) * (basePrice * 0.01);
        return {
          time,
          open: basePrice + offset,
          high: basePrice + offset * 1.05 + 1,
          low: basePrice + offset * 0.95 - 1,
          close: basePrice + offset * 1.02,
        };
      });
    }
  },

  getTicker: async (pair: CurrencyPair): Promise<Ticker> => {
    try {
      const response = await apiClient.get<Ticker>(`/market/ticker/${pair}`);
      return response.data;
    } catch {
      return {
        pair,
        price: pair === 'BTCUSDT' ? 62450.5 : pair === 'ETHUSDT' ? 3140.2 : pair === 'EURUSD' ? 1.0854 : 1.2542,
        change24h: 3.42,
        high24h: pair === 'BTCUSDT' ? 63200 : 3200,
        low24h: pair === 'BTCUSDT' ? 61100 : 3050,
        volume24h: 3410500,
      };
    }
  }
};
