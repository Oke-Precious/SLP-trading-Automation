/**
 * @file poi.ts
 * @description Types for Points of Interest (POIs) such as Order Blocks and Breaker Blocks.
 */

import { Timeframe } from '../types';

export type POIType = 'OB' | 'BB';
export type POIStatus = 'Active' | 'Mitigated' | 'Tested';

export interface POI {
  id: string;
  name: string;
  type: POIType;
  priceMin: number;
  priceMax: number;
  priceRange: string;
  status: POIStatus;
  timeframe: Timeframe;
  createdAt: string;
}

export interface OrderBlock extends POI {
  volumeProfileMax?: number;
}

export interface BreakerBlock extends POI {
  brokenAtPrice?: number;
}
