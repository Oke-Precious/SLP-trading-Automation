import { calculateBias } from './bias.algorithm.js';
import { Candle } from '../../shared/types/index.js';

export const analysisService = {
  calculateBias(candles: Candle[], timeframe: string = '1H') {
    return calculateBias(candles, timeframe);
  }
};
