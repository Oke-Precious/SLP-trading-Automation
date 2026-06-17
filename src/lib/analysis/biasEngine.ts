import { Candle } from '../market/marketDataService';

export type Bias = 'BULLISH' | 'BEARISH' | 'RANGING';
export type Strength = 'STRONG' | 'MODERATE' | 'WEAK';
export type Phase = 'IMPULSE' | 'CORRECTION' | 'REVERSAL' | 'CONSOLIDATION' | 'CONTINUATION';

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'HIGH' | 'LOW';
}

export interface BiasResult {
  bias: Bias;
  strength: Strength;
  structure: string;
  phase: Phase;
  nextMove: string;
  lastHH: number | null;
  lastHL: number | null;
  lastLH: number | null;
  lastLL: number | null;
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  trendlinePoints: { time: number; price: number }[];
}

// ── STEP 1: Find swing highs and lows ─────────────────────
export function detectSwings(candles: Candle[], lookback: number = 5): {
  highs: SwingPoint[];
  lows: SwingPoint[];
} {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const curr = candles[i];
    const window = candles.slice(i - lookback, i + lookback + 1);

    const isHigh = window.every((c, idx) => idx === lookback || c.high <= curr.high);
    const isLow  = window.every((c, idx) => idx === lookback || c.low  >= curr.low);

    if (isHigh) highs.push({ index: i, time: curr.time, price: curr.high, type: 'HIGH' });
    if (isLow)  lows.push({  index: i, time: curr.time, price: curr.low,  type: 'LOW'  });
  }

  return { highs, lows };
}

// ── STEP 2: Classify market structure ─────────────────────
export function classifyStructure(highs: SwingPoint[], lows: SwingPoint[], currentPrice?: number): {
  bias: Bias;
  structure: string;
  lastHH: number | null;
  lastHL: number | null;
  lastLH: number | null;
  lastLL: number | null;
} {
  if (highs.length < 2 || lows.length < 2) {
    return {
      bias: 'RANGING',
      structure: 'Insufficient data',
      lastHH: null,
      lastHL: null,
      lastLH: null,
      lastLL: null,
    };
  }

  const h1 = highs[highs.length - 2];
  const h2 = highs[highs.length - 1];
  const l1 = lows[lows.length - 2];
  const l2 = lows[lows.length - 1];

  let bias: Bias = 'RANGING';
  let structure = 'Mixed Structure / Consolidation';

  const isLowerHigh = h2.price < h1.price;
  const isLowerLow = l2.price < l1.price;
  const isHigherHigh = h2.price > h1.price;
  const isHigherLow = l2.price > l1.price;

  if (isHigherHigh && isHigherLow) {
    bias = 'BULLISH';
    structure = 'Higher Highs & Higher Lows';
  } else if (isLowerHigh && isLowerLow) {
    bias = 'BEARISH';
    structure = 'Lower Highs & Lower Lows';
  } else if (isLowerHigh && isHigherLow) {
    bias = 'RANGING';
    structure = 'Inside Structure (Consolidation)';
  } else if (isHigherHigh && isLowerLow) {
    bias = 'RANGING';
    structure = 'Expanding Structure (Volatility)';
  }

  // Fallback to recent momentum if ranging but we have current price
  if (bias === 'RANGING' && currentPrice) {
     if (currentPrice < l2.price && currentPrice < l1.price) {
        bias = 'BEARISH';
        structure = 'Structure Breakdown';
     } else if (currentPrice > h2.price && currentPrice > h1.price) {
        bias = 'BULLISH';
        structure = 'Structure Breakout';
     }
  }

  return {
    bias,
    structure,
    lastHH: bias === 'BULLISH' ? h2.price : null,
    lastHL: bias === 'BULLISH' ? l2.price : null,
    lastLH: bias === 'BEARISH' ? h2.price : null,
    lastLL: bias === 'BEARISH' ? l2.price : null,
  };
}

// ── STEP 3: Determine strength ─────────────────────────────
export function calculateStrength(
  candles: Candle[],
  bias: Bias,
  highs: SwingPoint[],
  lows: SwingPoint[]
): Strength {
  if (bias === 'RANGING') return 'WEAK';

  const last20 = candles.slice(-20);
  const avgRange20 = last20.reduce((s, c) => s + (c.high - c.low), 0) / 20;
  
  const last5 = candles.slice(-5);
  const avgRange5 = last5.reduce((s, c) => s + (c.high - c.low), 0) / 5;

  const trend5 = bias === 'BULLISH'
    ? last5.filter(c => c.close > c.open).length
    : last5.filter(c => c.close < c.open).length;

  // Structure check: 3+ consecutive HH+HL or LH+LL
  const recentHighs3 = highs.slice(-3);
  const recentLows3  = lows.slice(-3);
  
  const has3Consecutive = bias === 'BULLISH'
    ? recentHighs3.length >= 3 && recentLows3.length >= 3 &&
      recentHighs3.every((h,i) => i===0 || h.price > recentHighs3[i-1].price) &&
      recentLows3.every((l,i)  => i===0 || l.price > recentLows3[i-1].price)
    : recentHighs3.length >= 3 && recentLows3.length >= 3 &&
      recentHighs3.every((h,i) => i===0 || h.price < recentHighs3[i-1].price) &&
      recentLows3.every((l,i)  => i===0 || l.price < recentLows3[i-1].price);

  const recentHighs2 = highs.slice(-2);
  const recentLows2 = lows.slice(-2);
  const has2Consecutive = bias === 'BULLISH'
    ? recentHighs2.length >= 2 && recentLows2.length >= 2 &&
      recentHighs2[1].price > recentHighs2[0].price && 
      recentLows2[1].price > recentLows2[0].price
    : recentHighs2.length >= 2 && recentLows2.length >= 2 &&
      recentHighs2[1].price < recentHighs2[0].price && 
      recentLows2[1].price < recentLows2[0].price;

  if (has3Consecutive && trend5 >= 3 && avgRange5 > avgRange20) return 'STRONG';
  if (has2Consecutive) return 'MODERATE';
  
  return 'WEAK';
}

// ── STEP 4: Identify market phase ─────────────────────────
export function identifyPhase(candles: Candle[], bias: Bias): Phase {
  const last10 = candles.slice(-10);
  const last3  = candles.slice(-3);
  const last1  = candles[candles.length - 1];

  // Impulse: large candles in direction of bias
  const avgRange10 = last10.reduce((s,c) => s + (c.high - c.low), 0) / 10;
  const last1Range = last1.high - last1.low;
  const isImpulse  = last1Range > avgRange10 * 1.5 &&
    (bias === 'BULLISH' ? last1.close > last1.open : last1.close < last1.open);

  // Correction: small candles or counter-move
  const isCorrection = last3.every(c =>
    bias === 'BULLISH' ? c.close <= c.open : c.close >= c.open
  );

  // Consolidation: tiny ranges
  const avgRange3 = last3.reduce((s,c) => s + (c.high - c.low), 0) / 3;
  const isConsolidation = avgRange3 < avgRange10 * 0.5;

  if (isImpulse)       return 'IMPULSE';
  if (isConsolidation) return 'CONSOLIDATION';
  if (isCorrection)    return 'CORRECTION';
  return 'CONTINUATION';
}

// ── STEP 5: Predict next move ──────────────────────────────
export function predictNextMove(bias: Bias, phase: Phase, strength: Strength): string {
  if (bias === 'RANGING') return 'Wait for clear structure break';
  if (phase === 'IMPULSE' && strength === 'STRONG') {
    return bias === 'BULLISH' ? 'Continuation up — target next HH' : 'Continuation down — target next LL';
  }
  if (phase === 'CORRECTION') {
    return bias === 'BULLISH' ? 'Correction — watch for HL to buy' : 'Correction — watch for LH to sell';
  }
  if (phase === 'CONSOLIDATION') {
    return `Consolidation — wait for ${bias === 'BULLISH' ? 'bullish' : 'bearish'} breakout`;
  }
  return bias === 'BULLISH' ? 'Continuation Up' : 'Continuation Down';
}

// ── MASTER FUNCTION ────────────────────────────────────────
export function analyseBias(candles: Candle[], timeframe: string = '1h'): BiasResult {
  if (candles.length < 20) {
    return {
      bias: 'RANGING', strength: 'WEAK', structure: 'Insufficient data',
      phase: 'CONSOLIDATION', nextMove: 'Need more candle data',
      lastHH: null, lastHL: null, lastLH: null, lastLL: null,
      swingHighs: [], swingLows: [], trendlinePoints: [],
    };
  }

  let lookback = 3;
  if (timeframe === '1d' || timeframe === '4h') lookback = 5;
  if (timeframe === '15m') lookback = 2;

  const { highs, lows } = detectSwings(candles, lookback);
  const currentPrice = candles[candles.length - 1].close;
  const { bias, structure, lastHH, lastHL, lastLH, lastLL } = classifyStructure(highs, lows, currentPrice);
  const strength  = calculateStrength(candles, bias, highs, lows);
  const phase     = identifyPhase(candles, bias);
  const nextMove  = predictNextMove(bias, phase, strength);

  // Trendline points (connect recent lows in uptrend, recent highs in downtrend)
  const trendPoints = bias === 'BULLISH'
    ? lows.slice(-3).map(l  => ({ time: l.time, price: l.price }))
    : highs.slice(-3).map(h => ({ time: h.time, price: h.price }));

  return {
    bias, strength, structure, phase, nextMove,
    lastHH, lastHL, lastLH, lastLL,
    swingHighs: highs.slice(-10),
    swingLows:  lows.slice(-10),
    trendlinePoints: trendPoints,
  };
}
