/**
 * @file structure.ts
 * @description Helpers to analyze market structure (such as high/low boundaries and shift detections).
 */

import { Candle } from '../../types/market';

export const detectMarketStructureShift = (candles: Candle[]): { mssDetected: boolean; triggerPrice: number } => {
  if (candles.length < 5) return { mssDetected: false, triggerPrice: 0 };
  
  // Basic mock rule analyzing swing highs/lows breakout from recent ranges
  const recentCandles = candles.slice(-10);
  const highest = Math.max(...recentCandles.map((c) => c.high));
  const lastClose = candles[candles.length - 1].close;

  if (lastClose > highest * 0.99) {
    return { mssDetected: true, triggerPrice: highest };
  }

  return { mssDetected: false, triggerPrice: 0 };
};

export const findSwingPoints = (candles: Candle[]): { swingHighs: number[]; swingLows: number[] } => {
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  // Simplistic local extrema find to act as high/low anchors
  for (let i = 2; i < candles.length - 2; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    if (curr.high > prev1.high && curr.high > prev2.high && curr.high > next1.high && curr.high > next2.high) {
      swingHighs.push(curr.high);
    }
    if (curr.low < prev1.low && curr.low < prev2.low && curr.low < next1.low && curr.low < next2.low) {
      swingLows.push(curr.low);
    }
  }

  return { swingHighs, swingLows };
};
