/**
 * @file usePOIs.ts
 * @description React Query hook to fetch and keep sync of unmitigated Order Blocks/Breaker zones.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poiApi } from '../lib/api/poi';

export const usePOIs = (pair: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pois', pair],
    queryFn: () => poiApi.getPOIs(pair),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Mitigated' | 'Tested' }) =>
      poiApi.updatePOIStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pois', pair] });
    },
  });

  return {
    ...query,
    updatePOIStatus: mutation.mutate,
  };
};
