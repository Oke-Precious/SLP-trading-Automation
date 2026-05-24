/**
 * @file useAlerts.ts
 * @description React Query hook to fetch real-volume price alarms and threshold configurations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, CreateAlertData } from '../lib/api/alerts';
import { Alert } from '../types';

export const useAlerts = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Alert[]>({
    queryKey: ['price-alerts'],
    queryFn: () => alertsApi.getAlerts(),
  });

  const createMutation = useMutation({
    mutationFn: (newAlert: CreateAlertData) => alertsApi.createAlert(newAlert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => alertsApi.toggleAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });

  return {
    ...query,
    createAlert: createMutation.mutate,
    toggleAlert: toggleMutation.mutate,
  };
};

export const useCreateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newAlert: CreateAlertData) => alertsApi.createAlert(newAlert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });
};

export const useToggleAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.toggleAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });
};

