import { useMemo } from 'react';
import { analyseSLPBias, SLPBiasResult } from '../lib/slp/slpBias';
import { Candle } from '../lib/market/marketDataService';

export function useSLPBias(
  candles: Candle[],
  timeframe: string
): SLPBiasResult | null {
  return useMemo(() => {
    if (!candles || candles.length < 30) return null;
    return analyseSLPBias(candles, timeframe);
  }, [candles, timeframe]);
}
