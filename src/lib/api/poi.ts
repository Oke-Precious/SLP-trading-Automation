/**
 * @file poi.ts
 * @description API module for Points of Interest (POIs) CRUD directly on Firebase Firestore.
 */

import { POI } from '../../types';
import { 
  collection, 
  query, 
  where, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, getDocsWithTimeout } from '../firebase/firebase';
import { useAuthStore } from '../../store/useAuthStore';

export interface POIFilters {
  pair?: string;
  timeframe?: string;
  status?: string;
}

const DEFAULT_POIS: POI[] = [
  {
    id: 'poi-default-1',
    name: 'BTC Daily Order Block',
    type: 'OB',
    priceRange: '67,200.0 – 68,100.0',
    priceMin: 67200,
    priceMax: 68100,
    status: 'Active',
    timeframe: '1D',
    pair: 'BTCUSDT'
  },
  {
    id: 'poi-default-2',
    name: 'ETH H4 Breaker Block',
    type: 'BB',
    priceRange: '3,420.0 – 3,460.0',
    priceMin: 3420,
    priceMax: 3460,
    status: 'Tested',
    timeframe: '4H',
    pair: 'ETHUSDT'
  }
];

function getLocalPOIs(): POI[] {
  if (typeof window === 'undefined') return DEFAULT_POIS;
  const stored = localStorage.getItem('autoslp_local_pois');
  if (!stored) {
    localStorage.setItem('autoslp_local_pois', JSON.stringify(DEFAULT_POIS));
    return DEFAULT_POIS;
  }
  return JSON.parse(stored);
}

function saveLocalPOIs(pois: POI[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('autoslp_local_pois', JSON.stringify(pois));
  }
}

export const poiApi = {
  getPOIs: async (filters?: POIFilters | string): Promise<POI[]> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      let items = getLocalPOIs();
      const normalizedFilters = typeof filters === 'string' ? { pair: filters } : (filters || {});
      if (normalizedFilters.pair) {
        items = items.filter(p => p.pair === normalizedFilters.pair);
      }
      if (normalizedFilters.timeframe) {
        items = items.filter(p => p.timeframe.toLowerCase() === normalizedFilters.timeframe?.toLowerCase());
      }
      if (normalizedFilters.status) {
        items = items.filter(p => p.status.toLowerCase() === normalizedFilters.status?.toLowerCase());
      }
      return items;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const path = `users/${currentUser.uid}/pois`;
    try {
      // Each user's database is completely separated and isolated
      let q = query(collection(db, path));
      
      const res = await getDocsWithTimeout(q);
      let items: POI[] = [];

      res.forEach((docSnap) => {
        const item = docSnap.data();
        const typeMapped = (item.type === 'ORDER_BLOCK' || item.type === 'OB') ? 'OB' : 'BB';
        const rawStatus = String(item.status || '').toUpperCase();
        let statusMapped: 'Active' | 'Mitigated' | 'Tested' = 'Active';
        if (rawStatus === 'MITIGATED') statusMapped = 'Mitigated';
        else if (rawStatus === 'TESTED') statusMapped = 'Tested';

        items.push({
          id: docSnap.id,
          name: item.notes || (typeMapped === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
          type: typeMapped,
          priceRange: `${Number(item.priceFrom || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(item.priceTo || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
          priceMin: Number(item.priceFrom !== undefined ? item.priceFrom : 0),
          priceMax: Number(item.priceTo !== undefined ? item.priceTo : 0),
          status: statusMapped,
          timeframe: item.timeframe || '1H',
          pair: item.pair || 'BTCUSDT'
        } as POI);
      });

      // Front-end filter handling
      const normalizedFilters = typeof filters === 'string' ? { pair: filters } : (filters || {});
      if (normalizedFilters.pair) {
        items = items.filter(p => p.pair === normalizedFilters.pair);
      }
      if (normalizedFilters.timeframe) {
        items = items.filter(p => p.timeframe.toLowerCase() === normalizedFilters.timeframe?.toLowerCase());
      }
      if (normalizedFilters.status) {
        items = items.filter(p => p.status.toLowerCase() === normalizedFilters.status?.toLowerCase());
      }

      return items;
    } catch (error) {
      console.warn(`⚠️ [poiApi] Firestore getDocs failed on "${path}", falling back to Local Storage:`, error);
      let items = getLocalPOIs();
      const normalizedFilters = typeof filters === 'string' ? { pair: filters } : (filters || {});
      if (normalizedFilters.pair) {
        items = items.filter(p => p.pair === normalizedFilters.pair);
      }
      if (normalizedFilters.timeframe) {
        items = items.filter(p => p.timeframe.toLowerCase() === normalizedFilters.timeframe?.toLowerCase());
      }
      if (normalizedFilters.status) {
        items = items.filter(p => p.status.toLowerCase() === normalizedFilters.status?.toLowerCase());
      }
      return items;
    }
  },

  createPOI: async (poi: Omit<POI, 'id' | 'createdAt'> & { pair?: string }): Promise<POI> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    const newId = 'poi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    if (isSandbox) {
      const newPoi: POI = {
        id: newId,
        name: poi.name || (poi.type === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: poi.type,
        priceRange: `${Number(poi.priceMin).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(poi.priceMax).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: Number(poi.priceMin),
        priceMax: Number(poi.priceMax),
        status: poi.status || 'Active',
        timeframe: poi.timeframe || '1H',
        pair: poi.pair || 'BTCUSDT'
      };
      const items = getLocalPOIs();
      items.unshift(newPoi);
      saveLocalPOIs(items);
      return newPoi;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const path = `users/${currentUser.uid}/pois`;
    try {
      
      const payload = {
        id: newId,
        userId: currentUser.uid,
        pair: poi.pair || 'BTCUSDT',
        timeframe: poi.timeframe || '1H',
        type: poi.type === 'OB' ? 'ORDER_BLOCK' : 'BREAKER_BLOCK',
        priceFrom: Number(poi.priceMin),
        priceTo: Number(poi.priceMax),
        status: poi.status ? poi.status : 'Active',
        notes: poi.name || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, `users/${currentUser.uid}/pois`, newId), payload);

      return {
        id: newId,
        name: payload.notes || (poi.type === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: poi.type,
        priceRange: `${Number(payload.priceFrom).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(payload.priceTo).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: payload.priceFrom,
        priceMax: payload.priceTo,
        status: poi.status || 'Active',
        timeframe: payload.timeframe,
        pair: payload.pair
      };
    } catch (error) {
      console.warn(`⚠️ [poiApi] Firestore setDoc failed on "${path}", saving directly to Local Storage:`, error);
      const newPoi: POI = {
        id: newId,
        name: poi.name || (poi.type === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: poi.type,
        priceRange: `${Number(poi.priceMin).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(poi.priceMax).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: Number(poi.priceMin),
        priceMax: Number(poi.priceMax),
        status: poi.status || 'Active',
        timeframe: poi.timeframe || '1H',
        pair: poi.pair || 'BTCUSDT'
      };
      const items = getLocalPOIs();
      items.unshift(newPoi);
      saveLocalPOIs(items);
      return newPoi;
    }
  },

  updatePOIStatus: async (id: string, status: 'Active' | 'Mitigated' | 'Tested'): Promise<POI> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      const items = getLocalPOIs();
      const idx = items.findIndex(p => p.id === id);
      if (idx !== -1) {
        items[idx].status = status;
        saveLocalPOIs(items);
        return items[idx];
      }
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const path = `users/${currentUser.uid}/pois/${id}`;
    try {
      const docRef = doc(db, `users/${currentUser.uid}/pois`, id);
      await updateDoc(docRef, {
        status: status,
        updatedAt: new Date().toISOString()
      });

      return {
        id,
        name: 'Updated OB Zone',
        type: 'OB',
        priceRange: '',
        priceMin: 0,
        priceMax: 0,
        status,
        timeframe: '1H'
      };
    } catch (error) {
      console.warn(`⚠️ [poiApi] Firestore updateDoc failed on "${path}", saving directly to Local Storage:`, error);
      const items = getLocalPOIs();
      const idx = items.findIndex(p => p.id === id);
      if (idx !== -1) {
        items[idx].status = status;
        saveLocalPOIs(items);
        return items[idx];
      }
      return {
        id,
        name: 'Updated OB Zone',
        type: 'OB',
        priceRange: '',
        priceMin: 0,
        priceMax: 0,
        status,
        timeframe: '1H'
      };
    }
  },

  deletePOI: async (id: string): Promise<void> => {
    const isSandbox = useAuthStore.getState().user?.isSandbox;
    if (isSandbox) {
      const items = getLocalPOIs();
      const filtered = items.filter(p => p.id !== id);
      saveLocalPOIs(filtered);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const path = `users/${currentUser.uid}/pois/${id}`;
    try {
      const docRef = doc(db, `users/${currentUser.uid}/pois`, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn(`⚠️ [poiApi] Firestore deleteDoc failed on "${path}", deleting directly from Local Storage:`, error);
      const items = getLocalPOIs();
      const filtered = items.filter(p => p.id !== id);
      saveLocalPOIs(filtered);
    }
  }
};
