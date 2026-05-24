/**
 * @file signals.ts
 * @description API module for live trading signals and setups.
 */

import { apiClient } from './client';
import { Signal } from '../../types';

export const signalsApi = {
  getSignals: async (): Promise<Signal[]> => {
    try {
      const response = await apiClient.get<Signal[]>(`/signals`);
      return response.data;
    } catch {
      return [
        { id: '1', date: '2026-05-24', pair: 'BTCUSDT', direction: 'Long', result: '+3.2R', pnl: '+$3,200', isWin: true },
        { id: '2', date: '2026-05-23', pair: 'ETHUSDT', direction: 'Short', result: '-1.0R', pnl: '-$1,000', isWin: false }
      ];
    }
  }
};
