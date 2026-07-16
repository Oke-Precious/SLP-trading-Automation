import { Candle } from '../market/marketDataService';
import { analyseSLPStructure, MSSEvent, BOSEvent } from './slpMarketStructure';
import { Timeframe } from './timeframeHierarchy';
import { SLPBias } from './slpBias';

export type { MSSEvent, BOSEvent };

export interface SLPStructureResult {
  mssEvents: MSSEvent[];
  bosEvents: BOSEvent[];
}

function normalizeTimeframe(tf: string): Timeframe {
  const lower = tf.toLowerCase();
  if (lower === '1h') return '1h';
  if (lower === '4h') return '4h';
  if (lower === '1d') return '1d';
  if (lower === '1w') return '1w';
  return lower as Timeframe;
}

export function detectSLPStructure(
  candles:    Candle[],
  timeframe:  string,
  bias?:      SLPBias,
  swingHighs?: any[],
  swingLows?:  any[]
): SLPStructureResult {
  const tf = normalizeTimeframe(timeframe);
  const result = analyseSLPStructure(candles, tf);
  return {
    mssEvents: result.mssEvents,
    bosEvents: result.bosEvents
  };
}
export * from './slpMarketStructure';
