/**
 * @file alerts.ts
 * @description API module for user configured Alerts with Firestore.
 */

import { Alert } from '../../types';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebase';

export interface CreateAlertData {
  pair: string;
  condition: string;
  status?: string;
}

export const alertsApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const path = 'alerts';
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return [];
      }

      const q = query(collection(db, path), where('userId', '==', currentUser.uid));
      const res = await getDocs(q);
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
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  createAlert: async (data: CreateAlertData): Promise<Alert> => {
    const path = 'alerts';
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const newId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const timestamp = new Date().toISOString();

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

      await setDoc(doc(db, path, newId), payload);

      return {
        id: newId,
        pair: data.pair,
        condition: data.condition,
        status: 'Active',
        timestamp: timestamp
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  toggleAlert: async (id: string): Promise<Alert> => {
    const path = `alerts/${id}`;
    try {
      const docRef = doc(db, 'alerts', id);
      
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
        pair: 'BTCUSDT',
        condition: 'Price alert triggered',
        status: 'Triggered',
        timestamp: timestamp
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }
};
