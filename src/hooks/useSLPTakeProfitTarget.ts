import { useMemo } from 'react';
import { selectTakeProfitTarget, TakeProfitSelection } from '../lib/slp/slpLiquidityTargets';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { SLPPOI } from '../lib/slp/slpPOI';
import { Candle } from '../lib/market/marketDataService';

export function useSLPTakeProfitTarget(
  candles:         Candle[],
  structureResult: SLPStructureResult | null,
  poi:             SLPPOI | null,
  atr:             number
): TakeProfitSelection | null {
  return useMemo(() => {
    if (!candles || !structureResult || !poi || candles.length < 40) return null;
    return selectTakeProfitTarget(candles, structureResult, poi, atr);
  }, [candles, structureResult, poi, atr]);
}
