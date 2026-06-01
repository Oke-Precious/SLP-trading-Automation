import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Alert } from '../lib/alerts/alertEngine'

interface AlertStore {
  alerts: Alert[]
  addAlert: (alert: Omit<Alert,'id'|'createdAt'|'status'>) => void
  updateAlert: (id: string, changes: Partial<Alert>) => void
  deleteAlert: (id: string) => void
  disableAlert: (id: string) => void
  reenableAlert: (id: string) => void
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set) => ({
      alerts: [],

      addAlert: (alert) => set(state => ({
        alerts: [...state.alerts, {
          ...alert,
          id:        `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: Date.now(),
          status:    'ACTIVE' as const,
        }]
      })),

      updateAlert: (id, changes) => set(state => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, ...changes } : a)
      })),

      deleteAlert: (id) => set(state => ({
        alerts: state.alerts.filter(a => a.id !== id)
      })),

      disableAlert: (id) => set(state => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, status: 'DISABLED' } : a)
      })),

      reenableAlert: (id) => set(state => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, status: 'ACTIVE' } : a)
      })),
    }),
    { name: 'autoSLP-alerts' }
  )
)
