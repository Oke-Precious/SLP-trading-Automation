/**
 * @file useSignalStore.ts
 * @description Zustand store for controlling signal lists, recent triggers, and selected signals.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Signal } from '../types';

interface SignalState {
  signals: Signal[];
  recentSignals: Signal[];
  activeSignal: Signal | null;
  setSignals: (signals: Signal[]) => void;
  setActiveSignal: (signal: Signal | null) => void;
}

export const useSignalStore = create<SignalState>()(
  persist(
    (set) => ({
      signals: [
        { id: 'sig-1', date: '2026-05-24', pair: 'BTCUSDT', direction: 'Long', result: '+3.2R', pnl: '+$3,200', isWin: true },
        { id: 'sig-2', date: '2026-05-23', pair: 'ETHUSDT', direction: 'Short', result: '-1.0R', pnl: '-$1,000', isWin: false },
        { id: 'sig-3', date: '2026-05-22', pair: 'EURUSD', direction: 'Long', result: '+2.5R', pnl: '+$2,500', isWin: true },
        { id: 'sig-4', date: '2026-05-20', pair: 'BTCUSDT', direction: 'Long', result: 'Active', pnl: '+$450', isWin: true },
      ],
      recentSignals: [
        { id: 'sig-1', date: '2026-05-24', pair: 'BTCUSDT', direction: 'Long', result: '+3.2R', pnl: '+$3,200', isWin: true },
        { id: 'sig-2', date: '2026-05-23', pair: 'ETHUSDT', direction: 'Short', result: '-1.0R', pnl: '-$1,000', isWin: false },
      ],
      activeSignal: null,
      setSignals: (signals) => set({ signals }),
      setActiveSignal: (signal) => set({ activeSignal: signal }),
    }),
    { name: 'autoSLP-signals' }
  )
);
