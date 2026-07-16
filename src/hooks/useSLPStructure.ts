import { useMemo } from 'react';
import { analyseSLPStructure, SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { Candle } from '../lib/market/marketDataService';
import { Timeframe } from '../lib/slp/timeframeHierarchy';

export function useSLPStructure(
  candles:   Candle[],
  timeframe: Timeframe
): SLPStructureResult | null {
  return useMemo(() => {
    if (!candles || candles.length < 40) return null;
    return analyseSLPStructure(candles, timeframe);
  }, [candles, timeframe]);
}
export type { SLPStructureResult };
