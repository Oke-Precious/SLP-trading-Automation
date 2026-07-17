import { useMemo } from 'react';
import { detectInducements, InducementPoint } from '../lib/slp/slpInducement';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { Candle } from '../lib/market/marketDataService';

export function useSLPInducement(
  candles:         Candle[],
  structureResult: SLPStructureResult | null
): InducementPoint[] {
  return useMemo(() => {
    if (!candles || !structureResult || candles.length < 40) return [];
    return detectInducements(candles, structureResult);
  }, [candles, structureResult]);
}
export type { InducementPoint };
