/**
 * @file useBiasStore.ts
 * @description Zustand store for storing and manipulating the Directional Bias map per pair and timeframe.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrencyPair, Timeframe } from '../types';
import { BiasValue } from '../types/bias';

interface BiasState {
  biasMap: Record<CurrencyPair, Record<Timeframe, BiasValue>>;
  setBias: (pair: CurrencyPair, tf: Timeframe, bias: BiasValue) => void;
}

export const useBiasStore = create<BiasState>()(
  persist(
    (set) => ({
      biasMap: {
        BTCUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BEARISH', '15m': 'BEARISH', '5m': 'BEARISH' },
        ETHUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BEARISH', '30m': 'BEARISH', '15m': 'BEARISH', '5m': 'BEARISH' },
        EURUSD: { '1D': 'BEARISH', '4H': 'BEARISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' },
        GBPUSD: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' },
      } as any,
      setBias: (pair, tf, bias) =>
        set((state) => ({
          biasMap: {
            ...state.biasMap,
            [pair]: {
              ...state.biasMap[pair],
              [tf]: bias,
            },
          },
        })),
    }),
    { name: 'autoSLP-bias' }
  )
);
