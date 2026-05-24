/**
 * @file bias.ts
 * @description Types for directional bias, market structures, and break of structure data.
 */

import { CurrencyPair, Timeframe } from '../types';

export type BiasValue = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface StructuralPhase {
  pair: CurrencyPair;
  timeframe: Timeframe;
  phase: 'Uptrend' | 'Downtrend' | 'Ranging';
  swingHigh: number;
  swingLow: number;
  mssDetected: boolean; // Market Structure Shift
  inducementConfirmed: boolean;
}

export interface DirectionalBiasState {
  biasMap: Record<CurrencyPair, Record<Timeframe, BiasValue>>;
}
