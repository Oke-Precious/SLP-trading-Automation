import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { saveUserSettings, listenToUserSettings } from '../lib/firebase/firestoreService';

interface SettingsState {
  defaultPair: string;
  defaultTimeframe: string;
  twelveDataApiKey: string;
  notificationsEnabled: boolean;
  sidebarDefaultExpanded: boolean;
  timeFormat: '12H' | '24H';
  chartTheme: 'emerald-rose' | 'green-red' | 'blue-orange';
  setSetting: <K extends keyof Omit<SettingsState, 'setSetting' | 'setSettings' | 'syncWithFirebase'>>(key: K, value: SettingsState[K]) => void;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSetting' | 'setSettings' | 'syncWithFirebase'>>) => void;
  syncWithFirebase: (uid: string) => () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      defaultPair: 'BTCUSDT',
      defaultTimeframe: '4H',
      twelveDataApiKey: '',
      notificationsEnabled: false,
      sidebarDefaultExpanded: true,
      timeFormat: '12H',
      chartTheme: 'emerald-rose',
      
      setSetting: (key, value) => {
        set({ [key]: value } as any);
        
        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          const currentSettings = get();
          const { setSetting, setSettings, syncWithFirebase, ...serializable } = currentSettings;
          saveUserSettings(uid, { ...serializable, [key]: value }).catch(err =>
            console.error('[Firestore] Failed to save user settings:', err)
          );
        }
      },

      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToUserSettings(uid, (firebaseSettings) => {
          if (firebaseSettings) {
            const { updatedAt, ...cleanSettings } = firebaseSettings;
            get().setSettings(cleanSettings);
          }
        });
        return unsubscribe;
      }
    }),
    {
      name: 'autoSLP-settings',
    }
  )
);

export default useSettingsStore;
