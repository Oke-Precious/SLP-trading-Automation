/**
 * @file user.ts
 * @description Types for user profile, authentication state, and trading preferences.
 */

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface TradingPreferences {
  defaultRiskPercentage: number;
  selectedPairs: string[];
  alertChannels: {
    browser: boolean;
    telegram: boolean;
    discord: boolean;
  };
  theme: 'dark' | 'light';
}

export interface UserSession {
  user: UserProfile | null;
  preferences: TradingPreferences;
  token: string | null;
}
