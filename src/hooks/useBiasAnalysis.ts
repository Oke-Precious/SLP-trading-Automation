import { useMemo } from 'react';
import { analyseBias, BiasResult } from '../lib/analysis/biasEngine';
import { Candle } from '../lib/market/marketDataService';

export function useBiasAnalysis(candles: Candle[]): BiasResult | null {
  return useMemo(() => {
    if (!candles || candles.length < 20) return null;
    return analyseBias(candles);
  }, [candles]);
}
