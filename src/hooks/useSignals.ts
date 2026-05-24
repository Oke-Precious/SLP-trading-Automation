/**
 * @file useSignals.ts
 * @description React Query hook to fetch historical trading setups and signals logs.
 */

import { useQuery } from '@tanstack/react-query';
import { signalsApi, SignalFilters } from '../lib/api/signals';

export const useSignals = (filters?: SignalFilters) => {
  return useQuery({
    queryKey: ['trading-signals', filters],
    queryFn: () => signalsApi.getSignals(filters),
  });
};

export const useSignalById = (id: string) => {
  return useQuery({
    queryKey: ['trading-signal', id],
    queryFn: () => signalsApi.getSignalById(id),
    enabled: !!id,
  });
};

