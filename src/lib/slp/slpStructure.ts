import { Candle } from '../market/marketDataService';
import { analyseSLPStructure, MSSEvent, BOSEvent, SLPStructureResult } from './slpMarketStructure';
import { Timeframe } from './timeframeHierarchy';
import { SLPBias } from './slpBias';

export type { MSSEvent, BOSEvent, SLPStructureResult };

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
  return analyseSLPStructure(candles, tf);
}
export * from './slpMarketStructure';
