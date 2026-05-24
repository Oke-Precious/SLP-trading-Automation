import { Candle } from '../types';

export function normalizeCandle(rawKline: {
  s: string;   // Symbol (pair)
  t: number;   // Timestamp (start)
  o: string;   // Open price
  h: string;   // High price
  l: string;   // Low price
  c: string;   // Close price
  v: string;   // Volume
}): Candle {
  return {
    pair: rawKline.s,
    timeframe: '1d', // default extracted
    open: parseFloat(rawKline.o),
    high: parseFloat(rawKline.h),
    low: parseFloat(rawKline.l),
    close: parseFloat(rawKline.c),
    volume: parseFloat(rawKline.v),
    timestamp: new Date(rawKline.t)
  };
}
