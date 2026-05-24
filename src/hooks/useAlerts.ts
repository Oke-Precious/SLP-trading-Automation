/**
 * @file useAlerts.ts
 * @description React Query hook to fetch real-volume price alarms and threshold configurations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, CurrencyPair } from '../types';

export const useAlerts = (pair?: CurrencyPair) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['price-alerts', pair],
    queryFn: async (): Promise<Alert[]> => {
      const mockAlerts: Alert[] = [
        { id: 'al-1', pair: 'BTCUSDT', condition: 'Price crosses $62,500', status: 'Active', timestamp: new Date().toISOString() },
        { id: 'al-2', pair: 'ETHUSDT', condition: 'Price hits 4H Breaker Block ($3,120)', status: 'Active', timestamp: new Date().toISOString() },
      ];
      if (pair) {
        return mockAlerts.filter((a) => a.pair === pair);
      }
      return mockAlerts;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (id: string) => {
      // simulate trigger
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });

  return {
    ...query,
    triggerAlert: triggerMutation.mutate,
  };
};
