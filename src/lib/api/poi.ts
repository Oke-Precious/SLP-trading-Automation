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
      const response = await apiClient.get<any>(`/pois`, { params });
      const rawData = response.data;
      const dataArray = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.data) ? rawData.data : []);
      
      // Normalize Database model to Frontend format
      return dataArray.map((item: any) => {
        const typeMapped = (item.type === 'ORDER_BLOCK' || item.type === 'OB') ? 'OB' : 'BB';
        const rawStatus = String(item.status || '').toUpperCase();
        let statusMapped: 'Active' | 'Mitigated' | 'Tested' = 'Active';
        if (rawStatus === 'MITIGATED') statusMapped = 'Mitigated';
        else if (rawStatus === 'TESTED') statusMapped = 'Tested';

        return {
          id: String(item.id),
          name: item.notes || (typeMapped === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
          type: typeMapped,
          priceRange: item.priceRange || `${Number(item.priceFrom || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(item.priceTo || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
          priceMin: Number(item.priceFrom !== undefined ? item.priceFrom : item.priceMin || 0),
          priceMax: Number(item.priceTo !== undefined ? item.priceTo : item.priceMax || 0),
          status: statusMapped,
          timeframe: item.timeframe || '1H'
        } as POI;
      });
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

  createPOI: async (poi: Omit<POI, 'id' | 'createdAt'> & { pair?: string }): Promise<POI> => {
    try {
      // Safely map frontend creation payload to backend database schema
      const payload = {
        pair: poi.pair || 'BTCUSDT',
        timeframe: poi.timeframe || '1H',
        type: poi.type === 'OB' ? 'ORDER_BLOCK' : 'BREAKER_BLOCK',
        priceFrom: poi.priceMin,
        priceTo: poi.priceMax,
        status: poi.status ? poi.status.toUpperCase() : 'ACTIVE',
        notes: poi.name || ''
      };
      const response = await apiClient.post<any>(`/pois`, payload);
      const item = response.data;
      
      const typeMapped = (item.type === 'ORDER_BLOCK' || item.type === 'OB') ? 'OB' : 'BB';
      const rawStatus = String(item.status || '').toUpperCase();
      let statusMapped: 'Active' | 'Mitigated' | 'Tested' = 'Active';
      if (rawStatus === 'MITIGATED') statusMapped = 'Mitigated';
      else if (rawStatus === 'TESTED') statusMapped = 'Tested';

      return {
        id: String(item.id),
        name: item.notes || (typeMapped === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: typeMapped,
        priceRange: item.priceRange || `${Number(item.priceFrom || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(item.priceTo || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: Number(item.priceFrom !== undefined ? item.priceFrom : item.priceMin || 0),
        priceMax: Number(item.priceTo !== undefined ? item.priceTo : item.priceMax || 0),
        status: statusMapped,
        timeframe: item.timeframe || '1H'
      } as POI;
    } catch {
      return {
        id: 'p-' + Date.now(),
        ...poi
      } as POI;
    }
  },

  updatePOIStatus: async (id: string, status: 'Active' | 'Mitigated' | 'Tested'): Promise<POI> => {
    try {
      const response = await apiClient.patch<any>(`/pois/${id}`, { status: status.toUpperCase() });
      const item = response.data;

      const typeMapped = (item.type === 'ORDER_BLOCK' || item.type === 'OB') ? 'OB' : 'BB';
      const rawStatus = String(item.status || '').toUpperCase();
      let statusMapped: 'Active' | 'Mitigated' | 'Tested' = 'Active';
      if (rawStatus === 'MITIGATED') statusMapped = 'Mitigated';
      else if (rawStatus === 'TESTED') statusMapped = 'Tested';

      return {
        id: String(item.id),
        name: item.notes || (typeMapped === 'OB' ? 'POI - Order Block' : 'POI - Breaker Block'),
        type: typeMapped,
        priceRange: item.priceRange || `${Number(item.priceFrom || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${Number(item.priceTo || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}`,
        priceMin: Number(item.priceFrom !== undefined ? item.priceFrom : item.priceMin || 0),
        priceMax: Number(item.priceTo !== undefined ? item.priceTo : item.priceMax || 0),
        status: statusMapped,
        timeframe: item.timeframe || '1H'
      } as POI;
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

