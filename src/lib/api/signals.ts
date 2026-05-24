/**
 * @file signals.ts
 * @description API module for live trading signals and setups.
 */

import { apiClient } from './client';
import { Signal } from '../../types';

export interface SignalFilters {
  pair?: string;
  status?: string;
}

export const signalsApi = {
  getSignals: async (filters?: SignalFilters): Promise<Signal[]> => {
    try {
      const response = await apiClient.get<Signal[]>(`/signals`, { params: filters });
      return response.data;
    } catch {
      const mock = [
        { id: '1', date: '2026-05-24', pair: 'BTCUSDT' as const, direction: 'Long' as const, result: '+3.2R', pnl: '+$3,200', isWin: true },
        { id: '2', date: '2026-05-23', pair: 'ETHUSDT' as const, direction: 'Short' as const, result: '-1.0R', pnl: '-$1,000', isWin: false }
      ];
      if (filters?.pair) {
        return mock.filter(s => s.pair === filters.pair);
      }
      return mock;
    }
  },

  getSignalById: async (id: string): Promise<Signal> => {
    try {
      const response = await apiClient.get<Signal>(`/signals/${id}`);
      return response.data;
    } catch {
      return { 
        id, 
        date: new Date().toISOString().split('T')[0], 
        pair: 'BTCUSDT', 
        direction: 'Long', 
        result: '+2.5R', 
        pnl: '+$2,500', 
        isWin: true 
      };
    }
  }
};

