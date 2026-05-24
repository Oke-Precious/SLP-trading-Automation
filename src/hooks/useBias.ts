/**
 * @file useBias.ts
 * @description React Query hook to get bias profiles sync.
 */

import { useQuery } from '@tanstack/react-query';
import { CurrencyPair, Timeframe } from '../types';
import { calculateDirectionalBias } from '../lib/utils/bias';

export const useBias = (pair: CurrencyPair, timeframe: Timeframe) => {
  return useQuery({
    queryKey: ['directional-bias', pair, timeframe],
    queryFn: async () => {
      // Simulate checking a pattern sequence
      const biasValue = calculateDirectionalBias(pair, timeframe, true, true);
      return { pair, timeframe, bias: biasValue };
    },
  });
};
