/**
 * @file usePOIStore.ts
 * @description Zustand store for Point of Interest lists and active/mitigated zone selections.
 */

import { create } from 'zustand';
import { POI } from '../types';

interface POIState {
  pois: POI[];
  activePOI: POI | null;
  addPOI: (poi: POI) => void;
  removePOI: (id: string) => void;
  setActivePOI: (poi: POI | null) => void;
  setPOIs: (pois: POI[]) => void;
}

export const usePOIStore = create<POIState>((set) => ({
  pois: [
    { id: 'poi-1', name: 'Daily Bullish Order Block', type: 'OB', priceRange: '$61,200 - $61,800', priceMin: 61200, priceMax: 61800, status: 'Active', timeframe: '1D' },
    { id: 'poi-2', name: '4H Bearish Breaker Block', type: 'BB', priceRange: '$63,500 - $64,000', priceMin: 63500, priceMax: 64000, status: 'Active', timeframe: '4H' },
    { id: 'poi-3', name: '1H Mitigated Demand Zone', type: 'OB', priceRange: '$59,100 - $59,600', priceMin: 59100, priceMax: 59600, status: 'Mitigated', timeframe: '1H' }
  ],
  activePOI: null,
  addPOI: (poi) => set((state) => ({ pois: [...state.pois, poi] })),
  removePOI: (id) => set((state) => ({ pois: state.pois.filter((p) => p.id !== id) })),
  setActivePOI: (poi) => set({ activePOI: poi }),
  setPOIs: (pois) => set({ pois }),
}));
