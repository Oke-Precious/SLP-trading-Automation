/**
 * @file usePOIs.ts
 * @description React Query hook to fetch and keep sync of unmitigated Order Blocks/Breaker zones.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poiApi, POIFilters } from '../lib/api/poi';
import { POI } from '../types';

export const usePOIs = (filtersInput?: POIFilters | string) => {
  const filters = typeof filtersInput === 'string' ? { pair: filtersInput } : (filtersInput || {});

  return useQuery({
    queryKey: ['pois', filters],
    queryFn: () => poiApi.getPOIs(filters),
  });
};

export const useCreatePOI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPoi: Omit<POI, 'id'>) => poiApi.createPOI(newPoi),
    onMutate: async (newPoi) => {
      // Cancel target queries
      await queryClient.cancelQueries({ queryKey: ['pois'] });

      // Save previous state snapshot
      const previousPOIs = queryClient.getQueryData(['pois']);

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['pois'] }, (old: any) => {
        const fakePOI = { id: 'temp-' + Date.now(), ...newPoi };
        if (Array.isArray(old)) {
          return [...old, fakePOI];
        }
        return [fakePOI];
      });

      return { previousPOIs };
    },
    onError: (err, newPoi, context) => {
      if (context?.previousPOIs) {
        queryClient.setQueriesData({ queryKey: ['pois'] }, context.previousPOIs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    },
  });
};

export const useUpdatePOI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Mitigated' | 'Tested' }) =>
      poiApi.updatePOIStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    },
  });
};

export const useDeletePOI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const confirmDelete = window.confirm('Are you sure you want to delete this Point of Interest (POI) zone?');
      if (!confirmDelete) {
        throw new Error('Deletion cancelled');
      }
      await poiApi.deletePOI(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pois'] });
    },
  });
};

