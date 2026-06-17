/**
 * @file usePOIStore.ts
 * @description Zustand store for Point of Interest lists and active/mitigated zone selections.
 * Enhanced with Firestore sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POI } from '../types';
import { useAuthStore } from './useAuthStore';
import { savePOI, updatePOI, deletePOI, listenToPOIs } from '../lib/firebase/firestoreService';

interface POIState {
  userPOIs: POI[];
  autoPOIs: POI[];
  allPOIs: POI[];
  pois: POI[]; // keep as alias for UI components
  activePOI: POI | null;
  addPOI: (poi: POI) => void;
  removePOI: (id: string) => void;
  deletePOI: (id: string) => void;
  setActivePOI: (poi: POI | null) => void;
  setPOIs: (pois: POI[]) => void;
  setUserPOIs: (pois: POI[]) => void;
  clearUserPOIs: () => void;
  syncWithFirebase: (uid: string) => () => void;
}

export const usePOIStore = create<POIState>()(
  persist(
    (set, get) => ({
      userPOIs: [
        { id: 'poi-1', name: 'Daily Bullish Order Block', type: 'OB', priceRange: '$61,200 - $61,800', priceMin: 61200, priceMax: 61800, status: 'Active', timeframe: '1D' },
        { id: 'poi-2', name: '4H Bearish Breaker Block', type: 'BB', priceRange: '$63,500 - $64,000', priceMin: 63500, priceMax: 64000, status: 'Active', timeframe: '4H' }
      ],
      autoPOIs: [],
      allPOIs: [],
      pois: [],
      activePOI: null,

      addPOI: (poi) => {
        set((state) => {
          const userPOIs = [...state.userPOIs, poi];
          const all = [...userPOIs, ...state.autoPOIs];
          return { userPOIs, allPOIs: all, pois: all };
        });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          savePOI(uid, poi).catch(err =>
            console.error('[Firestore] Failed to save POI:', err)
          );
        }
      },

      removePOI: (id) => {
        set((state) => {
          const userPOIs = state.userPOIs.filter((p) => p.id !== id);
          const autoPOIs = state.autoPOIs.filter((p) => p.id !== id);
          const all = [...userPOIs, ...autoPOIs];
          return { userPOIs, autoPOIs, allPOIs: all, pois: all };
        });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          deletePOI(uid, id).catch(err =>
            console.error('[Firestore] Failed to delete POI:', err)
          );
        }
      },

      deletePOI: (id) => {
        set((state) => {
          const userPOIs = state.userPOIs.filter((p) => p.id !== id);
          const autoPOIs = state.autoPOIs.filter((p) => p.id !== id);
          const all = [...userPOIs, ...autoPOIs];
          return { userPOIs, autoPOIs, allPOIs: all, pois: all };
        });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          deletePOI(uid, id).catch(err =>
            console.error('[Firestore] Failed to delete POI:', err)
          );
        }
      },

      setActivePOI: (poi) => set({ activePOI: poi }),

      setPOIs: (autoPois) => set((state) => {
        const all = [...state.userPOIs, ...autoPois];
        return { autoPOIs: autoPois, allPOIs: all, pois: all };
      }),

      setUserPOIs: (pois) => set((state) => {
        const all = [...pois, ...state.autoPOIs];
        return { userPOIs: pois, allPOIs: all, pois: all };
      }),

      clearUserPOIs: () => set((state) => {
        const all = [...state.autoPOIs];
        return { userPOIs: [], allPOIs: all, pois: all };
      }),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToPOIs(uid, (pois) => {
          const typedPOIs = pois.map(p => ({
            id: p.id,
            name: p.name || '',
            type: p.type || 'OB',
            priceRange: p.priceRange || '',
            priceMin: p.priceMin || 0,
            priceMax: p.priceMax || 0,
            status: p.status || 'Active',
            timeframe: p.timeframe || '1D'
          }));
          get().setUserPOIs(typedPOIs);
        });
        return unsubscribe;
      }
    }),
    {
      name: 'autoSLP-poi',
      partialize: (state) => ({ userPOIs: state.userPOIs }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const all = [...(state.userPOIs || []), ...(state.autoPOIs || [])];
          state.allPOIs = all;
          state.pois = all;
        }
      }
    }
  )
);
