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
      signals: [],
      recentSignals: [],
      activeSignal: null,
      setSignals: (signals) => set({ signals }),
      setActiveSignal: (signal) => set({ activeSignal: signal }),
    }),
    { name: 'autoSLP-signals' }
  )
);
