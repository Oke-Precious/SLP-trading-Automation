import { apiClient } from './client';
import { Alert } from '../../types';

export interface CreateAlertData {
  pair: string;
  condition: string;
  status?: string;
}

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get<Alert[]>(`/alerts`);
      return response.data;
    } catch {
      return [
        { id: 'al-1', pair: 'BTCUSDT', condition: 'Price crosses $62,500', status: 'Active', timestamp: new Date().toISOString() },
        { id: 'al-2', pair: 'ETHUSDT', condition: 'Price hits 4H Breaker Block ($3,120)', status: 'Active', timestamp: new Date().toISOString() },
      ];
    }
  },

  createAlert: async (data: CreateAlertData): Promise<Alert> => {
    try {
      const response = await apiClient.post<Alert>(`/alerts`, data);
      return response.data;
    } catch {
      return {
        id: 'al-' + Date.now(),
        pair: data.pair as any,
        condition: data.condition,
        status: 'Active',
        timestamp: new Date().toISOString()
      };
    }
  },

  toggleAlert: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.patch<Alert>(`/alerts/${id}/toggle`);
      return response.data;
    } catch {
      return {
        id,
        pair: 'BTCUSDT',
        condition: 'Price crossed limit threshold',
        status: 'Triggered',
        timestamp: new Date().toISOString()
      };
    }
  }
};
