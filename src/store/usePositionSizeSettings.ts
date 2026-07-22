import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PositionSizeSettingsStore {
  accountBalance:    number;
  riskPercent:       number;
  setAccountBalance: (v: number) => void;
  setRiskPercent:    (v: number) => void;
}

export const usePositionSizeSettings = create<PositionSizeSettingsStore>()(
  persist(
    (set) => ({
      accountBalance: 10000,
      riskPercent:    1,
      setAccountBalance: (accountBalance) => set({ accountBalance }),
      setRiskPercent:    (riskPercent)    => set({ riskPercent }),
    }),
    { name: 'autoSLP-position-sizing' }
  )
);
