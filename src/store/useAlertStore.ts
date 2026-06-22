import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Alert } from '../lib/alerts/alertEngine'
import { useAuthStore } from './useAuthStore'
import { useMarketStore } from './useMarketStore'
import {
  saveAlert,
  updateAlert as firebaseUpdateAlert,
  deleteAlert as firebaseDeleteAlert,
  listenToAlerts
} from '../lib/firebase/firestoreService'

interface AlertStore {
  alerts: Alert[]
  addAlert: (alert: Omit<Alert,'id'|'createdAt'|'status'>) => void
  updateAlert: (id: string, changes: Partial<Alert>) => void
  deleteAlert: (id: string) => void
  disableAlert: (id: string) => void
  reenableAlert: (id: string) => void
  setAlerts: (alerts: Alert[]) => void
  clearAlerts: () => void
  syncWithFirebase: (uid: string) => () => void
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (alert) => {
        const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newAlert: Alert = {
          ...alert,
          id,
          createdAt: Date.now(),
          status: 'ACTIVE' as const,
        };

        set(state => ({
          alerts: [...state.alerts, newAlert]
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          saveAlert(uid, newAlert).catch(err =>
            console.error('[Firestore] Failed to save alert:', err)
          );
        }
      },

      updateAlert: (id, changes) => {
        set(state => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, ...changes } : a)
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseUpdateAlert(uid, id, changes).catch(err =>
            console.error('[Firestore] Failed to update alert:', err)
          );
        }
      },

      deleteAlert: (id) => {
        set(state => ({
          alerts: state.alerts.filter(a => a.id !== id)
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseDeleteAlert(uid, id).catch(err =>
            console.error('[Firestore] Failed to delete alert:', err)
          );
        }
      },

      disableAlert: (id) => {
        set(state => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, status: 'DISABLED' as const } : a)
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseUpdateAlert(uid, id, { status: 'DISABLED' }).catch(err =>
            console.error('[Firestore] Failed to disable alert:', err)
          );
        }
      },

      reenableAlert: (id) => {
        set(state => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, status: 'ACTIVE' as const } : a)
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseUpdateAlert(uid, id, { status: 'ACTIVE' }).catch(err =>
            console.error('[Firestore] Failed to reenable alert:', err)
          );
        }
      },

      setAlerts: (alertsList) => set({ alerts: alertsList }),

      clearAlerts: () => set({ alerts: [] }),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToAlerts(uid, (alertsFromFirebase) => {
          const parsed = alertsFromFirebase.map(a => ({
            id: a.id,
            pair: a.pair || useMarketStore.getState().selectedPair,
            condition: a.condition || 'PRICE_ABOVE',
            value: a.value || 0,
            value2: a.value2,
            targetBias: a.targetBias,
            status: a.status || 'ACTIVE',
            channels: a.channels || { inApp: true, browser: false, sound: true },
            createdAt: a.createdAt || Date.now(),
            triggeredAt: a.triggeredAt,
            label: a.label || `Alert for ${a.pair}`
          }));
          get().setAlerts(parsed);
        });
        return unsubscribe;
      },
    }),
    { name: 'autoSLP-alerts' }
  )
)
