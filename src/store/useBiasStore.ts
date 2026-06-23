/**
 * @file useBiasStore.ts
 * @description Zustand store for storing and manipulating the Directional Bias map per pair and timeframe.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrencyPair, Timeframe } from '../types';
import { BiasValue } from '../types/bias';
import { useAuthStore } from './useAuthStore';
import { saveUserBias, listenToUserBias } from '../lib/firebase/firestoreService';

interface BiasState {
  biasMap: Record<CurrencyPair, Partial<Record<Timeframe, BiasValue>>>;
  setBias: (pair: CurrencyPair, tf: Timeframe, bias: BiasValue) => void;
  setBiasMap: (biasMap: BiasState['biasMap']) => void;
  syncWithFirebase: (uid: string) => () => void;
}

export const useBiasStore = create<BiasState>()(
  persist(
    (set, get) => ({
      biasMap: {
        BTCUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BEARISH', '15m': 'BEARISH', '5m': 'BEARISH' },
        ETHUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BEARISH', '30m': 'BEARISH', '15m': 'BEARISH', '5m': 'BEARISH' },
        EURUSD: { '1D': 'BEARISH', '4H': 'BEARISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' },
        GBPUSD: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' },
      } as any,
      
      setBias: (pair, tf, bias) => {
        set((state) => {
          const nextBiasMap = {
            ...state.biasMap,
            [pair]: {
              ...state.biasMap[pair],
              [tf]: bias,
            },
          };

          const user = useAuthStore.getState().user;
          const uid = user?.uid || user?.id;
          if (uid) {
            saveUserBias(uid, nextBiasMap).catch(err =>
              console.error('[Firestore] Failed to save bias map:', err)
            );
          }

          return { biasMap: nextBiasMap };
        });
      },

      setBiasMap: (biasMap) => set({ biasMap }),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToUserBias(uid, (firebaseBiasMap) => {
          if (firebaseBiasMap) {
            get().setBiasMap(firebaseBiasMap);
          }
        });
        return unsubscribe;
      }
    }),
    { name: 'autoSLP-bias' }
  )
);
