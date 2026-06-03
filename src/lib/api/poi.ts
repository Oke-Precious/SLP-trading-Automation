/**
 * @file poi.ts
 * @description API module for Points of Interest (POIs) CRUD directly on Firebase Firestore.
 */

import { POI } from '../../types';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebase';

export interface POIFilters {
  pair?: string;
  timeframe?: string;
  status?: string;
}

export const poiApi = {
  getPOIs: async (filters?: POIFilters | string): Promise<POI[]> => {
    const path = 'pois';
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return [];
      }

      // Constrain query to the active user as enforced by secure list constraints in rules
      let q = query(collection(db, path), where('userId', '==', currentUser.uid));
      
      const res = await getDocs(q);
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
          timeframe: item.timeframe || '1H'
        } as POI);
      });

      // Front-end filter handling
      const normalizedFilters = typeof filters === 'string' ? { pair: filters } : (filters || {});
      if (normalizedFilters.pair) {
        items = items.filter(p => p.timeframe === normalizedFilters.pair); // Some codes treat pair as string in filters input
      }
      if (normalizedFilters.timeframe) {
        items = items.filter(p => p.timeframe.toLowerCase() === normalizedFilters.timeframe?.toLowerCase());
      }
      if (normalizedFilters.status) {
        items = items.filter(p => p.status.toLowerCase() === normalizedFilters.status?.toLowerCase());
      }

      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  createPOI: async (poi: Omit<POI, 'id' | 'createdAt'> & { pair?: string }): Promise<POI> => {
    const path = 'pois';
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const newId = 'poi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      
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

      await setDoc(doc(db, path, newId), payload);

      return {
        id: newId,
        name: payload.notes || (poi.type === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: poi.type,
        priceRange: `${Number(payload.priceFrom).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(payload.priceTo).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: payload.priceFrom,
        priceMax: payload.priceTo,
        status: poi.status || 'Active',
        timeframe: payload.timeframe
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  updatePOIStatus: async (id: string, status: 'Active' | 'Mitigated' | 'Tested'): Promise<POI> => {
    const path = `pois/${id}`;
    try {
      const docRef = doc(db, 'pois', id);
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
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  deletePOI: async (id: string): Promise<void> => {
    const path = `pois/${id}`;
    try {
      const docRef = doc(db, 'pois', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
