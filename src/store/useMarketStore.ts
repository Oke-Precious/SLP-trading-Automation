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
  setSelectedPair: (pair: CurrencyPair) => void;
  setSelectedTimeframe: (tf: Timeframe) => void;
  setCandles: (candles: Candle[]) => void;
  setTicker: (ticker: Ticker) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedPair: 'BTCUSDT',
  selectedTimeframe: '4H',
  candles: [],
  ticker: null,
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setCandles: (candles) => set({ candles }),
  setTicker: (ticker) => set({ ticker }),
}));
