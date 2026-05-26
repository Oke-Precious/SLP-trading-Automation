import { Candle, PivotPoint, SwingPoints } from '../../shared/types/index.js';

export function detectSwingPoints(candles: Candle[], lookback: number = 5): SwingPoints {
  const highs: PivotPoint[] = [];
  const lows: PivotPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const target = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= target.high || candles[i + j].high > target.high) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= target.low || candles[i + j].low < target.low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      highs.push({ price: target.high, index: i, timestamp: target.timestamp });
    }
    if (isSwingLow) {
      lows.push({ price: target.low, index: i, timestamp: target.timestamp });
    }
  }

  return { highs, lows };
}

export function classifyStructure(swingHighs: PivotPoint[], swingLows: PivotPoint[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (swingHighs.length < 3 || swingLows.length < 3) {
    return 'NEUTRAL';
  }

  const lastHighs = swingHighs.slice(-3);
  const lastLows = swingLows.slice(-3);

  const makesHigherHighs = lastHighs[2].price > lastHighs[1].price && lastHighs[1].price > lastHighs[0].price;
  const makesHigherLows = lastLows[2].price > lastLows[1].price && lastLows[1].price > lastLows[0].price;

  const makesLowerHighs = lastHighs[2].price < lastHighs[1].price && lastHighs[1].price < lastHighs[0].price;
  const makesLowerLows = lastLows[2].price < lastLows[1].price && lastLows[1].price < lastLows[0].price;

  if (makesHigherHighs || makesHigherLows) {
    return 'BULLISH';
  }
  if (makesLowerHighs || makesLowerLows) {
    return 'BEARISH';
  }
  return 'NEUTRAL';
}
