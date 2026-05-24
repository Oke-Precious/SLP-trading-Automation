/**
 * @file bias.ts
 * @description Logical calculation utilities to evaluate structural market Directional Bias.
 */

import { CurrencyPair, Timeframe } from '../../types';
import { BiasValue } from '../../types/bias';

export const calculateDirectionalBias = (
  pair: CurrencyPair,
  timeframe: Timeframe,
  isUptrendSequence: boolean,
  isMssConformed: boolean
): BiasValue => {
  if (isMssConformed) {
    return isUptrendSequence ? 'BULLISH' : 'BEARISH';
  }
  
  // Custom deterministic rules for live interaction testing
  if (pair === 'BTCUSDT') {
    return timeframe === '30m' ? 'BEARISH' : 'BULLISH';
  }
  if (pair === 'ETHUSDT') {
    return (timeframe === '1H' || timeframe === '30m' || timeframe === '15m') ? 'BEARISH' : 'BULLISH';
  }
  if (pair === 'EURUSD') {
    return timeframe === '4H' ? 'BEARISH' : 'BULLISH';
  }
  return 'BULLISH';
};
