/**
 * @file useMarketStore.ts
 * @description Zustand store for active pair, selected timeframe, candles, and real-time tickers.
 */

import { create } from 'zustand';
import { CurrencyPair, Timeframe } from '../types';
import { Candle, Ticker } from '../types/market';

interface MarketState {
  selectedPair: CurrencyPair;
  selectedTimeframe: Timeframe;
  candles: Candle[];
  ticker: Ticker | null;
  appStateMode: 'healthy' | 'loading' | 'error' | 'empty';
  layoutVariant: 'A' | 'B';
  setSelectedPair: (pair: CurrencyPair) => void;
  setSelectedTimeframe: (tf: Timeframe) => void;
  setCandles: (candles: Candle[]) => void;
  setTicker: (ticker: Ticker) => void;
  setAppStateMode: (mode: 'healthy' | 'loading' | 'error' | 'empty') => void;
  setLayoutVariant: (variant: 'A' | 'B') => void;
}

const getStoredLayout = (): 'A' | 'B' => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('autoslp_layout_variant');
    if (stored === 'A' || stored === 'B') {
      return stored;
    }
  }
  return 'A'; // Layout A is default
};

export const useMarketStore = create<MarketState>((set) => ({
  selectedPair: 'BTCUSDT',
  selectedTimeframe: '4H',
  candles: [],
  ticker: null,
  appStateMode: 'healthy',
  layoutVariant: getStoredLayout(),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setCandles: (candles) => set({ candles }),
  setTicker: (ticker) => set({ ticker }),
  setAppStateMode: (mode) => set({ appStateMode: mode }),
  setLayoutVariant: (variant) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoslp_layout_variant', variant);
    }
    set({ layoutVariant: variant });
  },
}));
