import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  defaultPair: string;
  defaultTimeframe: string;
  twelveDataApiKey: string;
  notificationsEnabled: boolean;
  sidebarDefaultExpanded: boolean;
  timeFormat: '12H' | '24H';
  chartTheme: 'emerald-rose' | 'green-red' | 'blue-orange';
  setSetting: <K extends keyof Omit<SettingsState, 'setSetting'>>(key: K, value: SettingsState[K]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultPair: 'BTCUSDT',
      defaultTimeframe: '4H',
      twelveDataApiKey: '',
      notificationsEnabled: false,
      sidebarDefaultExpanded: true,
      timeFormat: '12H',
      chartTheme: 'emerald-rose',
      setSetting: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'autoSLP-settings',
    }
  )
);

export default useSettingsStore;
