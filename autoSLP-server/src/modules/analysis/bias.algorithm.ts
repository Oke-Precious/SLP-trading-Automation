import { Candle } from '../../shared/types/index.js';
import { detectSwingPoints, classifyStructure } from './structure.algorithm.js';

interface BiasResult {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  lastHH: number | null;
  lastHL: number | null;
  structure: string;
}

export function calculateBias(candles: Candle[], tf: string): BiasResult {
  let lookback = 2; // default
  const lowerTf = tf.toLowerCase();
  if (lowerTf.includes('d') || lowerTf.includes('1d')) {
    lookback = 5;
  } else if (lowerTf.includes('4h')) {
    lookback = 3;
  }

  const { highs, lows } = detectSwingPoints(candles, lookback);
  const structure = classifyStructure(highs, lows);

  const lastHHObj = highs.length > 0 ? highs[highs.length - 1] : null;
  const lastHLObj = lows.length > 0 ? lows[lows.length - 1] : null;

  const lastHH = lastHHObj ? lastHHObj.price : null;
  const lastHL = lastHLObj ? lastHLObj.price : null;

  // Slope / linear momentum metrics check (simple trendline slope estimation over last 4 candles close)
  let momentumIsGrowing = false;
  if (candles.length > 4) {
    const end = candles.length - 1;
    const diff1 = candles[end].close - candles[end - 1].close;
    const diff2 = candles[end - 2].close - candles[end - 3].close;
    momentumIsGrowing = Math.abs(diff1) > Math.abs(diff2);
  }

  let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
  if (structure === 'BULLISH' || structure === 'BEARISH') {
    if (momentumIsGrowing) {
      strength = 'STRONG';
    } else {
      strength = 'MODERATE';
    }
  }

  return {
    bias: structure,
    strength,
    lastHH,
    lastHL,
    structure: `Market Structure Classed as ${structure} via Lookback Window ${lookback}`
  };
}
