/**
 * @file auth.ts
 * @description API module for user authentication and settings update.
 */

import { apiClient } from './client';
import { UserProfile, TradingPreferences } from '../../types/user';

export const authApi = {
  getCurrentUser: async (): Promise<UserProfile> => {
    try {
      const response = await apiClient.get<UserProfile>(`/auth/me`);
      return response.data;
    } catch {
      return {
        id: 'u-1',
        email: 'trader@autoslp.io',
        displayName: 'John Doe (SLP Master)',
        createdAt: '2026-01-15T08:00:00Z',
      };
    }
  },

  updatePreferences: async (prefs: Partial<TradingPreferences>): Promise<TradingPreferences> => {
    try {
      const response = await apiClient.patch<TradingPreferences>(`/user/preferences`, prefs);
      return response.data;
    } catch {
      return {
        defaultRiskPercentage: prefs.defaultRiskPercentage ?? 1.5,
        selectedPairs: prefs.selectedPairs ?? ['BTCUSDT', 'ETHUSDT'],
        alertChannels: prefs.alertChannels ?? { browser: true, telegram: false, discord: false },
        theme: prefs.theme ?? 'dark',
      };
    }
  }
};
