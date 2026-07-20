import { useMemo } from 'react';
import { detectOrderBlocks, OrderBlockCandidate } from '../lib/slp/slpOrderBlock';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { Candle } from '../lib/market/marketDataService';

export function useSLPOrderBlocks(
  candles:         Candle[],
  structureResult: SLPStructureResult | null
): OrderBlockCandidate[] {
  return useMemo(() => {
    if (!candles || !structureResult || candles.length < 40) return [];
    return detectOrderBlocks(candles, structureResult);
  }, [candles, structureResult]);
}

export type { OrderBlockCandidate };
