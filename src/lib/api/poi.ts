/**
 * @file poi.ts
 * @description API module for Points of Interest (POIs) CRUD.
 */

import { apiClient } from './client';
import { POI } from '../../types';

export const poiApi = {
  getPOIs: async (pair: string): Promise<POI[]> => {
    try {
      const response = await apiClient.get<POI[]>(`/pois`, { params: { pair } });
      return response.data;
    } catch {
      // Offline fallback
      return [
        { id: 'p1', name: 'Daily Demand Order Block (Unmitigated)', type: 'OB', priceRange: '$61,200 - $61,800', priceMin: 61200, priceMax: 61800, status: 'Active', timeframe: '1D' },
        { id: 'p2', name: '4H Bearish Breaker Block (Tested)', type: 'BB', priceRange: '$63,500 - $64,000', priceMin: 63500, priceMax: 64000, status: 'Tested', timeframe: '4H' }
      ];
    }
  },

  createPOI: async (poi: Omit<POI, 'id' | 'createdAt'>): Promise<POI> => {
    const response = await apiClient.post<POI>(`/pois`, poi);
    return response.data;
  },

  updatePOIStatus: async (id: string, status: 'Active' | 'Mitigated' | 'Tested'): Promise<POI> => {
    const response = await apiClient.patch<POI>(`/pois/${id}`, { status });
    return response.data;
  },

  deletePOI: async (id: string): Promise<void> => {
    await apiClient.delete(`/pois/${id}`);
  }
};
