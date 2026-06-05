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
import { useAuthStore } from '../../store/useAuthStore';

export interface SignalFilters {
  pair?: string;
  status?: string;
}

const DEFAULT_SIGNALS: Signal[] = [
  {
    id: 'sig-default-1',
    date: new Date().toISOString().split('T')[0],
    pair: 'BTCUSDT',
    direction: 'Long',
    result: 'OPEN',
    pnl: '0.0%',
    isWin: false
  },
  {
    id: 'sig-default-2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    pair: 'ETHUSDT',
    direction: 'Long',
    result: '+3.0R',
    pnl: '+4.5%',
    isWin: true
  },
  {
    id: 'sig-default-3',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    pair: 'SOLUSDT',
    direction: 'Short',
    result: '-1.0R',
    pnl: '-1.5%',
    isWin: false
  }
];

function getLocalSignals(): Signal[] {
  if (typeof window === 'undefined') return DEFAULT_SIGNALS;
  const stored = localStorage.getItem('autoslp_local_signals');
  if (!stored) {
    localStorage.setItem('autoslp_local_signals', JSON.stringify(DEFAULT_SIGNALS));
    return DEFAULT_SIGNALS;
  }
  return JSON.parse(stored);
}

export const signalsApi = {
  getSignals: async (filters?: SignalFilters): Promise<Signal[]> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      let items = getLocalSignals();
      if (filters?.pair) {
        items = items.filter(s => s.pair === filters.pair);
      }
      return items;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const path = `users/${currentUser.uid}/signals`;
    try {
      const q = query(collection(db, path));
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
      console.warn(`⚠️ [signalsApi] Firestore getDocs failed on "${path}", falling back to Local Storage:`, error);
      let items = getLocalSignals();
      if (filters?.pair) {
        items = items.filter(s => s.pair === filters.pair);
      }
      return items;
    }
  },

  getSignalById: async (id: string): Promise<Signal> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      const items = getLocalSignals();
      const signal = items.find(s => s.id === id);
      if (signal) return signal;
      throw new Error('Signal not found');
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const path = `users/${currentUser.uid}/signals/${id}`;
    try {
      const docSnap = await getDoc(doc(db, `users/${currentUser.uid}/signals`, id));
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
      console.warn(`⚠️ [signalsApi] Firestore getDoc failed on "${path}", falling back to Local Storage:`, error);
      const items = getLocalSignals();
      const signal = items.find(s => s.id === id);
      if (signal) return signal;
      throw error;
    }
  }
};
