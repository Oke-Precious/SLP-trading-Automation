/**
 * @file useSignals.ts
 * @description React Query hook to fetch historical trading setups and signals logs.
 */

import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../lib/api/signals';

export const useSignals = () => {
  return useQuery({
    queryKey: ['trading-signals'],
    queryFn: () => signalsApi.getSignals(),
  });
};
