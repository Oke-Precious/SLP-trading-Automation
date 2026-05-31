import { Candle } from '../market/marketDataService';

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
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
export function classifyStructure(highs: SwingPoint[], lows: SwingPoint[]): {
  bias: Bias;
  structure: string;
  lastHH: number | null;
  lastHL: number | null;
  lastLH: number | null;
  lastLL: number | null;
} {
  if (highs.length < 2 || lows.length < 2) {
    return {
      bias: 'NEUTRAL',
      structure: 'Insufficient data',
      lastHH: null,
      lastHL: null,
      lastLH: null,
      lastLL: null,
    };
  }

  const recentHighs = highs.slice(-3);
  const recentLows  = lows.slice(-3);

  const bullishHighs = recentHighs.every((h, i) => i === 0 || h.price > recentHighs[i-1].price);
  const bullishLows  = recentLows.every((l,  i) => i === 0 || l.price > recentLows[i-1].price);
  const bearishHighs = recentHighs.every((h, i) => i === 0 || h.price < recentHighs[i-1].price);
  const bearishLows  = recentLows.every((l,  i) => i === 0 || l.price < recentLows[i-1].price);

  const lastHH = bullishHighs ? recentHighs[recentHighs.length-1].price : null;
  const lastHL  = bullishLows  ? recentLows[recentLows.length-1].price   : null;
  const lastLH  = bearishHighs ? recentHighs[recentHighs.length-1].price : null;
  const lastLL  = bearishLows  ? recentLows[recentLows.length-1].price   : null;

  if (bullishHighs && bullishLows) {
    return { bias: 'BULLISH', structure: 'Higher Highs & Higher Lows', lastHH, lastHL, lastLH: null, lastLL: null };
  }
  if (bearishHighs && bearishLows) {
    return { bias: 'BEARISH', structure: 'Lower Highs & Lower Lows', lastHH: null, lastHL: null, lastLH, lastLL };
  }
  return {
    bias: 'NEUTRAL',
    structure: 'Mixed Structure / Consolidation',
    lastHH,
    lastHL,
    lastLH,
    lastLL,
  };
}

// ── STEP 3: Determine strength ─────────────────────────────
export function calculateStrength(
  candles: Candle[],
  bias: Bias,
  highs: SwingPoint[],
  lows: SwingPoint[]
): Strength {
  if (bias === 'NEUTRAL') return 'WEAK';

  const last20 = candles.slice(-20);
  const avgRange = last20.reduce((s, c) => s + (c.high - c.low), 0) / 20;
  const lastCandle = candles[candles.length - 1];
  const lastRange = lastCandle.high - lastCandle.low;

  // Momentum check: last 5 candles trending strongly
  const last5 = candles.slice(-5);
  const trend5 = bias === 'BULLISH'
    ? last5.filter(c => c.close > c.open).length
    : last5.filter(c => c.close < c.open).length;

  // Structure check: 3+ consecutive HH+HL or LH+LL
  const recentHighs = highs.slice(-3);
  const recentLows  = lows.slice(-3);
  const cleanStructure = bias === 'BULLISH'
    ? recentHighs.every((h,i) => i===0 || h.price > recentHighs[i-1].price) &&
      recentLows.every((l,i)  => i===0 || l.price > recentLows[i-1].price)
    : recentHighs.every((h,i) => i===0 || h.price < recentHighs[i-1].price) &&
      recentLows.every((l,i)  => i===0 || l.price < recentLows[i-1].price);

  if (cleanStructure && trend5 >= 4 && lastRange > avgRange) return 'STRONG';
  if (cleanStructure && trend5 >= 3) return 'MODERATE';
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
  if (bias === 'NEUTRAL') return 'Wait for clear structure break';
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
export function analyseBias(candles: Candle[]): BiasResult {
  if (candles.length < 20) {
    return {
      bias: 'NEUTRAL', strength: 'WEAK', structure: 'Insufficient data',
      phase: 'CONSOLIDATION', nextMove: 'Need more candle data',
      lastHH: null, lastHL: null, lastLH: null, lastLL: null,
      swingHighs: [], swingLows: [], trendlinePoints: [],
    };
  }

  const lookback = candles.length > 100 ? 5 : 3;
  const { highs, lows } = detectSwings(candles, lookback);
  const { bias, structure, lastHH, lastHL, lastLH, lastLL } = classifyStructure(highs, lows);
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
