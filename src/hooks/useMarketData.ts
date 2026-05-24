/**
 * @file useMarketData.ts
 * @description React Query hook to get and cache candlestick datasets for active currency pairs and intervals.
 */

import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../lib/api/market';
import { CurrencyPair, Timeframe } from '../types';

export const useMarketData = (pair: CurrencyPair, timeframe: Timeframe) => {
  return useQuery({
    queryKey: ['market-candles', pair, timeframe],
    queryFn: () => marketApi.getHistoricalCandles(pair, timeframe),
    refetchInterval: 15000, // Fetch updates every 15s
  });
};
