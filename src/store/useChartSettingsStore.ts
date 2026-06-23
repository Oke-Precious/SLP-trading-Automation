import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { saveUserChartSettings, listenToUserChartSettings } from '../lib/firebase/firestoreService';

export interface ChartSettings {
  // Background
  backgroundColor:    string;   // default: '#131722'
  // Grid
  gridColor:          string;   // default: '#1E2433'
  // Candles
  upCandleColor:      string;   // default: '#26A69A'
  downCandleColor:    string;   // default: '#EF5350'
  upWickColor:        string;   // default: '#26A69A'
  downWickColor:      string;   // default: '#EF5350'
  // SMC Overlays
  bosUpColor:         string;   // default: '#26A69A'
  bosDownColor:       string;   // default: '#EF5350'
  chochColor:         string;   // default: '#F0B90B'
  mssColor:           string;   // default: '#CAAA98'
  bullOBColor:        string;   // default: '#26A69A'
  bearOBColor:        string;   // default: '#EF5350'
  breakerColor:       string;   // default: '#1565C0'
  bslColor:           string;   // default: '#F0B90B'
  sslColor:           string;   // default: '#9A8678'
  fvgBullColor:       string;   // default: '#26A69A'
  fvgBearColor:       string;   // default: '#EF5350'
  // Visibility toggles
  showBOS:            boolean;  // default: true
  showCHoCH:          boolean;  // default: true
  showMSS:            boolean;  // default: true
  showOrderBlocks:    boolean;  // default: true
  showBreakerBlocks:  boolean;  // default: true
  showLiquidity:      boolean;  // default: true
  showFVG:            boolean;  // default: true
  showInducement:     boolean;  // default: true
  showVolume:         boolean;  // default: true
  // Presets
  preset: 'dark' | 'dark-green' | 'midnight' | 'custom';
}

const DEFAULTS: ChartSettings = {
  backgroundColor: '#131722',
  gridColor:       '#1E2433',
  upCandleColor:   '#26A69A',
  downCandleColor: '#EF5350',
  upWickColor:     '#26A69A',
  downWickColor:   '#EF5350',
  bosUpColor:      '#26A69A',
  bosDownColor:    '#EF5350',
  chochColor:      '#F0B90B',
  mssColor:        '#CAAA98',
  bullOBColor:     '#26A69A',
  bearOBColor:     '#EF5350',
  breakerColor:    '#1565C0',
  bslColor:        '#F0B90B',
  sslColor:        '#9A8678',
  fvgBullColor:    '#26A69A',
  fvgBearColor:    '#EF5350',
  showBOS:            true,
  showCHoCH:          true,
  showMSS:            true,
  showOrderBlocks:    true,
  showBreakerBlocks:  true,
  showLiquidity:      true,
  showFVG:            true,
  showInducement:     true,
  showVolume:         true,
  preset:             'dark',
};

export const PRESETS: Record<string, Partial<ChartSettings>> = {
  dark: {
    backgroundColor: '#131722', gridColor: '#1E2433',
    upCandleColor: '#26A69A', downCandleColor: '#EF5350', preset: 'dark',
  },
  'dark-green': {
    backgroundColor: '#0d1117', gridColor: '#161b22',
    upCandleColor: '#3fb950', downCandleColor: '#f85149', preset: 'dark-green',
  },
  midnight: {
    backgroundColor: '#0a0a1a', gridColor: '#12122a',
    upCandleColor: '#7c83fd', downCandleColor: '#ff6b6b', preset: 'midnight',
  },
};

interface ChartSettingsStore {
  settings: ChartSettings;
  updateSetting: <K extends keyof ChartSettings>(key: K, value: ChartSettings[K]) => void;
  applyPreset: (preset: keyof typeof PRESETS) => void;
  resetToDefaults: () => void;
  setSettings: (settings: ChartSettings) => void;
  syncWithFirebase: (uid: string) => () => void;
}

let saveTimeout: any = null;

export const useChartSettingsStore = create<ChartSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULTS,
      
      updateSetting: (key, value) => {
        const nextSettings = { ...get().settings, [key]: value, preset: 'custom' as const };
        set({ settings: nextSettings });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            saveUserChartSettings(uid, nextSettings).catch(err =>
              console.error('[Firestore] Failed to save chart settings:', err)
            );
          }, 800);
        }
      },

      applyPreset: (preset) => {
        const nextSettings = { ...get().settings, ...PRESETS[preset], preset: preset as any };
        set({ settings: nextSettings });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveUserChartSettings(uid, nextSettings).catch(err =>
            console.error('[Firestore] Failed to apply chart preset settings:', err)
          );
        }
      },

      resetToDefaults: () => {
        set({ settings: DEFAULTS });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveUserChartSettings(uid, DEFAULTS).catch(err =>
            console.error('[Firestore] Failed to reset chart settings:', err)
          );
        }
      },

      setSettings: (settings) => set({ settings }),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToUserChartSettings(uid, (firebaseSettings) => {
          if (firebaseSettings) {
            get().setSettings(firebaseSettings);
          }
        });
        return unsubscribe;
      }
    }),
    { name: 'autoSLP-chart-settings' }
  )
);
