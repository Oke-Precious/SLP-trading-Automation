/**
 * @file poi.ts
 * @description API module for Points of Interest (POIs) CRUD.
 */

import { apiClient } from './client';
import { POI } from '../../types';

export interface POIFilters {
  pair?: string;
  timeframe?: string;
  status?: string;
}

export const poiApi = {
  getPOIs: async (filters?: POIFilters | string): Promise<POI[]> => {
    try {
      const params = typeof filters === 'string' ? { pair: filters } : (filters || {});
      const response = await apiClient.get<POI[]>(`/pois`, { params });
      return response.data;
    } catch {
      // Offline fallback
      const mock = [
        { id: 'p1', name: 'Daily Demand Order Block (Unmitigated)', type: 'OB' as const, priceRange: '$61,200 - $61,800', priceMin: 61200, priceMax: 61800, status: 'Active' as const, timeframe: '1D' as const },
        { id: 'p2', name: '4H Bearish Breaker Block (Tested)', type: 'BB' as const, priceRange: '$63,500 - $64,000', priceMin: 63500, priceMax: 64000, status: 'Tested' as const, timeframe: '4H' as const }
      ];
      
      const normalizedFilters = typeof filters === 'string' ? { pair: filters } : (filters || {});
      let result = mock;
      if (normalizedFilters.timeframe) {
        result = result.filter(p => p.timeframe.toLowerCase() === normalizedFilters.timeframe?.toLowerCase());
      }
      if (normalizedFilters.status) {
        result = result.filter(p => p.status.toLowerCase() === normalizedFilters.status?.toLowerCase());
      }
      return result;
    }
  },

  createPOI: async (poi: Omit<POI, 'id' | 'createdAt'>): Promise<POI> => {
    try {
      const response = await apiClient.post<POI>(`/pois`, poi);
      return response.data;
    } catch {
      return {
        id: 'p-' + Date.now(),
        ...poi
      };
    }
  },

  updatePOIStatus: async (id: string, status: 'Active' | 'Mitigated' | 'Tested'): Promise<POI> => {
    try {
      const response = await apiClient.patch<POI>(`/pois/${id}`, { status });
      return response.data;
    } catch {
      return {
        id,
        name: 'Updated OB Zone',
        type: 'OB',
        priceRange: '$63,000 - $64,000',
        priceMin: 63000,
        priceMax: 64000,
        status,
        timeframe: '1H'
      };
    }
  },

  deletePOI: async (id: string): Promise<void> => {
    await apiClient.delete(`/pois/${id}`).catch(() => {});
  }
};

