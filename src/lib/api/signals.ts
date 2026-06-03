/**
 * @file signals.ts
 * @description API module for live trading signals and setups directly on Firebase Firestore.
 */

import { Signal } from '../../types';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebase';

export interface SignalFilters {
  pair?: string;
  status?: string;
}

export const signalsApi = {
  getSignals: async (filters?: SignalFilters): Promise<Signal[]> => {
    const path = 'signals';
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return [];
      }

      const q = query(collection(db, path), where('userId', '==', currentUser.uid));
      const res = await getDocs(q);
      let items: Signal[] = [];

      res.forEach((docSnap) => {
        const item = docSnap.data();
        items.push({
          id: docSnap.id,
          date: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          pair: item.pair,
          direction: item.direction === 'LONG' || item.direction === 'Long' ? 'Long' : 'Short',
          result: item.status === 'HIT_TP1' || item.status === 'HIT_TP2' ? '+3.0R' : (item.status === 'STOPPED' ? '-1.0R' : 'OPEN'),
          pnl: item.pnlPercent ? `${item.pnlPercent > 0 ? '+' : ''}${item.pnlPercent}%` : '0.0%',
          isWin: item.status === 'HIT_TP1' || item.status === 'HIT_TP2'
        });
      });

      if (filters?.pair) {
        items = items.filter(s => s.pair === filters.pair);
      }

      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getSignalById: async (id: string): Promise<Signal> => {
    const path = `signals/${id}`;
    try {
      const docSnap = await getDoc(doc(db, 'signals', id));
      if (!docSnap.exists()) {
        throw new Error('Signal not found');
      }

      const item = docSnap.data();
      return {
        id: docSnap.id,
        date: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        pair: item.pair,
        direction: item.direction === 'LONG' || item.direction === 'Long' ? 'Long' : 'Short',
        result: item.status === 'HIT_TP1' || item.status === 'HIT_TP2' ? '+3.0R' : (item.status === 'STOPPED' ? '-1.0R' : 'OPEN'),
        pnl: item.pnlPercent ? `${item.pnlPercent > 0 ? '+' : ''}${item.pnlPercent}%` : '0.0%',
        isWin: item.status === 'HIT_TP1' || item.status === 'HIT_TP2'
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  }
};
