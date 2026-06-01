/**
 * @file usePOIStore.ts
 * @description Zustand store for Point of Interest lists and active/mitigated zone selections.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POI } from '../types';

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
}

export const usePOIStore = create<POIState>()(
  persist(
    (set) => ({
      userPOIs: [
        { id: 'poi-1', name: 'Daily Bullish Order Block', type: 'OB', priceRange: '$61,200 - $61,800', priceMin: 61200, priceMax: 61800, status: 'Active', timeframe: '1D' },
        { id: 'poi-2', name: '4H Bearish Breaker Block', type: 'BB', priceRange: '$63,500 - $64,000', priceMin: 63500, priceMax: 64000, status: 'Active', timeframe: '4H' }
      ],
      autoPOIs: [],
      allPOIs: [],
      pois: [],
      activePOI: null,

      addPOI: (poi) => set((state) => {
        const userPOIs = [...state.userPOIs, poi];
        const all = [...userPOIs, ...state.autoPOIs];
        return { userPOIs, allPOIs: all, pois: all };
      }),

      removePOI: (id) => set((state) => {
        const userPOIs = state.userPOIs.filter((p) => p.id !== id);
        const autoPOIs = state.autoPOIs.filter((p) => p.id !== id);
        const all = [...userPOIs, ...autoPOIs];
        return { userPOIs, autoPOIs, allPOIs: all, pois: all };
      }),

      deletePOI: (id) => set((state) => {
        const userPOIs = state.userPOIs.filter((p) => p.id !== id);
        const autoPOIs = state.autoPOIs.filter((p) => p.id !== id);
        const all = [...userPOIs, ...autoPOIs];
        return { userPOIs, autoPOIs, allPOIs: all, pois: all };
      }),

      setActivePOI: (poi) => set({ activePOI: poi }),

      setPOIs: (autoPois) => set((state) => {
        const all = [...state.userPOIs, ...autoPois];
        return { autoPOIs: autoPois, allPOIs: all, pois: all };
      }),
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
