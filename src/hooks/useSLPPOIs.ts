import { useMemo } from 'react';
import { detectSLPPOIs, getValidSLPPOIs, SLPPOI } from '../lib/slp/slpPOI';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { InducementPoint } from '../lib/slp/slpInducement';
import { OrderBlockCandidate } from '../lib/slp/slpOrderBlock';
import { Candle } from '../lib/market/marketDataService';

export function useSLPPOIs(
  candles:         Candle[],
  structureResult: SLPStructureResult | null,
  orderBlocks:     OrderBlockCandidate[],
  inducements:     InducementPoint[]
): { all: SLPPOI[]; valid: SLPPOI[] } {
  return useMemo(() => {
    if (!candles || !structureResult || candles.length < 40) {
      return { all: [], valid: [] };
    }
    const all = detectSLPPOIs(candles, structureResult, orderBlocks, inducements);
    return { all, valid: getValidSLPPOIs(all) };
  }, [candles, structureResult, orderBlocks, inducements]);
}

export type { SLPPOI };
