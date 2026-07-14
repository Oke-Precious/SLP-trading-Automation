import { useMemo } from 'react';
import { runSLPPipeline, SLPSetup } from '../lib/slp/slpPipeline';
import { Candle } from '../lib/market/marketDataService';

export function useSLPAnalysis(
  candles:   Candle[],
  timeframe: string,
  pair:      string
): SLPSetup | null {
  return useMemo(() => {
    if (!candles || candles.length < 50) return null;
    return runSLPPipeline(candles, timeframe, pair);
  }, [candles, timeframe, pair]);
}
