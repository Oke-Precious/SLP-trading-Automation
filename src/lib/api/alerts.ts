/**
 * @file alerts.ts
 * @description API module for user configured Alerts with Firestore.
 */

import { Alert } from '../../types';
import { 
  collection, 
  query, 
  where, 
  doc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, getDocsWithTimeout } from '../firebase/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useMarketStore } from '../../store/useMarketStore';

export interface CreateAlertData {
  pair: string;
  condition: string;
  status?: string;
}

const DEFAULT_ALERTS: Alert[] = [
  {
    id: 'alert-default-1',
    pair: 'BTCUSDT',
    condition: 'Price > 69,500',
    status: 'Active',
    timestamp: new Date().toISOString()
  },
  {
    id: 'alert-default-2',
    pair: 'ETHUSDT',
    condition: 'Price < 3,420',
    status: 'Triggered',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

function getLocalAlerts(): Alert[] {
  if (typeof window === 'undefined') return DEFAULT_ALERTS;
  const stored = localStorage.getItem('autoslp_local_alerts');
  if (!stored) {
    localStorage.setItem('autoslp_local_alerts', JSON.stringify(DEFAULT_ALERTS));
    return DEFAULT_ALERTS;
  }
  return JSON.parse(stored);
}

function saveLocalAlerts(alerts: Alert[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('autoslp_local_alerts', JSON.stringify(alerts));
  }
}

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      return getLocalAlerts();
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const path = `users/${currentUser.uid}/alerts`;
    try {
      const q = query(collection(db, path));
      const res = await getDocsWithTimeout(q);
      const items: Alert[] = [];

      res.forEach((docSnap) => {
        const item = docSnap.data();
        items.push({
          id: docSnap.id,
          pair: item.pair,
          condition: item.condition,
          status: item.status === 'ACTIVE' || item.status === 'Active' ? 'Active' : 'Triggered',
          timestamp: item.createdAt || new Date().toISOString()
        });
      });

      return items;
    } catch (error) {
      console.warn(`⚠️ [alertsApi] Firestore getDocs failed on "${path}", falling back to Local Storage:`, error);
      return getLocalAlerts();
    }
  },

  createAlert: async (data: CreateAlertData): Promise<Alert> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    const newId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const timestamp = new Date().toISOString();

    if (isSandbox) {
      const newAlert: Alert = {
        id: newId,
        pair: data.pair,
        condition: data.condition,
        status: 'Active',
        timestamp: timestamp
      };
      const items = getLocalAlerts();
      items.unshift(newAlert);
      saveLocalAlerts(items);
      return newAlert;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const path = `users/${currentUser.uid}/alerts`;
    try {

      const payload = {
        id: newId,
        userId: currentUser.uid,
        pair: data.pair,
        condition: data.condition,
        status: 'ACTIVE', // Standard active code matching ruleset
        value: data.condition,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(doc(db, `users/${currentUser.uid}/alerts`, newId), payload);

      return {
        id: newId,
        pair: data.pair,
        condition: data.condition,
        status: 'Active',
        timestamp: timestamp
      };
    } catch (error) {
      console.warn(`⚠️ [alertsApi] Firestore setDoc failed on "${path}", saving directly to Local Storage:`, error);
      const newAlert: Alert = {
        id: newId,
        pair: data.pair,
        condition: data.condition,
        status: 'Active',
        timestamp: timestamp
      };
      const items = getLocalAlerts();
      items.unshift(newAlert);
      saveLocalAlerts(items);
      return newAlert;
    }
  },

  toggleAlert: async (id: string): Promise<Alert> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      const items = getLocalAlerts();
      const idx = items.findIndex(a => a.id === id);
      if (idx !== -1) {
        items[idx].status = items[idx].status === 'Active' ? 'Triggered' : 'Active';
        saveLocalAlerts(items);
        return items[idx];
      }
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const path = `users/${currentUser.uid}/alerts/${id}`;
    try {
      const docRef = doc(db, `users/${currentUser.uid}/alerts`, id);
      
      // Since it's a toggle, normally we will retrieve and switch status in transaction
      // But simple set/update works fine for UI toggle:
      const timestamp = new Date().toISOString();
      await updateDoc(docRef, {
        status: 'TRIGGERED', 
        triggeredAt: timestamp,
        updatedAt: timestamp
      });

      return {
        id,
        pair: useMarketStore.getState().selectedPair,
        condition: 'Price alert triggered',
        status: 'Triggered',
        timestamp: timestamp
      };
    } catch (error) {
      console.warn(`⚠️ [alertsApi] Firestore updateDoc failed on "${path}", toggling directly in Local Storage:`, error);
      const items = getLocalAlerts();
      const idx = items.findIndex(a => a.id === id);
      if (idx !== -1) {
        items[idx].status = items[idx].status === 'Active' ? 'Triggered' : 'Active';
        saveLocalAlerts(items);
        return items[idx];
      }
      return {
        id,
        pair: useMarketStore.getState().selectedPair,
        condition: 'Price alert toggled',
        status: 'Triggered',
        timestamp: new Date().toISOString()
      };
    }
  }
};
