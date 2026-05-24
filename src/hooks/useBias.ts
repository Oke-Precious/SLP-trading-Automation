/**
 * @file useBias.ts
 * @description React Query hook to get bias profiles sync.
 */

import { useQuery } from '@tanstack/react-query';
import { CurrencyPair, Timeframe } from '../types';
import { apiClient } from '../lib/api/client';
import { calculateDirectionalBias } from '../lib/utils/bias';

export const useBias = (pair: CurrencyPair, timeframe: Timeframe) => {
  return useQuery({
    queryKey: ['directional-bias', pair, timeframe],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/market/bias`, {
          params: { pair, timeframe }
        });
        return response.data;
      } catch {
        // Fallback for demo preview stability
        const biasValue = calculateDirectionalBias(pair, timeframe, true, true);
        return { pair, timeframe, bias: biasValue };
      }
    },
  });
};

