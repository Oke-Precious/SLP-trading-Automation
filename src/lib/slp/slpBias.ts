import { Candle } from "../market/marketDataService";

// ── TYPES ────────────────────────────────────────────

export type SLPBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type BiasStrength = 'STRONG' | 'MODERATE' | 'WEAK';

export interface SwingPoint {
  index:     number;    // candle index in the array
  time:      number;    // Unix timestamp
  price:     number;    // swing high price or swing low price
  type:      'HIGH' | 'LOW';
  confirmed: boolean;   // true only after N candles have closed on each side
}

export interface SLPBiasResult {
  bias:          SLPBias;
  strength:      BiasStrength;
  structure:     string;        // human-readable e.g. "Higher Highs & Higher Lows"
  swingHighs:    SwingPoint[];  // last 5 confirmed swing highs
  swingLows:     SwingPoint[];  // last 5 confirmed swing lows
  lastHH:        SwingPoint | null;
  lastHL:        SwingPoint | null;
  lastLH:        SwingPoint | null;
  lastLL:        SwingPoint | null;
  analysedAt:    number;        // timestamp of analysis
  candleCount:   number;        // how many candles were analysed
  phase:         'IMPULSE' | 'CORRECTION' | 'REVERSAL' | 'CONSOLIDATION' | 'CONTINUATION';
  nextMove:      string;
}

// ── SWING POINT DETECTION ────────────────────────────

function getTimeframeLookback(timeframe: string): number {
  const tf = timeframe.toLowerCase();
  switch(tf) {
    case '1d': return 5;   // 5 daily candles each side
    case '4h': return 5;   // 5 four-hour candles each side
    case '1h': return 3;   // 3 one-hour candles each side
    case '30m': return 3;
    case '15m': return 2;
    case '5m':  return 2;
    default:    return 3;
  }
}

export function detectSwingPoints(
  candles: Candle[],
  timeframe: string
): { highs: SwingPoint[]; lows: SwingPoint[] } {

  const lookback = getTimeframeLookback(timeframe);
  const highs: SwingPoint[] = [];
  const lows:  SwingPoint[] = [];

  // Only analyse up to candles.length - lookback
  // This ensures we only detect CONFIRMED swings
  // (candles to the right have actually closed)
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];

    // Check swing HIGH: candle[i].high is highest in window
    const isSwingHigh =
      candles.slice(i - lookback, i).every(x => x.high < c.high) &&
      candles.slice(i + 1, i + lookback + 1).every(x => x.high < c.high);

    if (isSwingHigh) {
      highs.push({
        index:     i,
        time:      c.time,
        price:     c.high,
        type:      'HIGH',
        confirmed: true,
      });
    }

    // Check swing LOW: candle[i].low is lowest in window
    const isSwingLow =
      candles.slice(i - lookback, i).every(x => x.low > c.low) &&
      candles.slice(i + 1, i + lookback + 1).every(x => x.low > c.low);

    if (isSwingLow) {
      lows.push({
        index:     i,
        time:      c.time,
        price:     c.low,
        type:      'LOW',
        confirmed: true,
      });
    }
  }

  return { highs, lows };
}

// ── BIAS CLASSIFICATION ──────────────────────────────

export function classifyBias(
  highs: SwingPoint[],
  lows:  SwingPoint[]
): Pick<SLPBiasResult, 'bias'|'structure'|'lastHH'|'lastHL'|'lastLH'|'lastLL'> {

  if (highs.length < 2 || lows.length < 2) {
    return {
      bias: 'NEUTRAL', structure: 'Insufficient swing data',
      lastHH: null, lastHL: null, lastLH: null, lastLL: null,
    };
  }

  const recentHighs = highs.slice(-3);
  const recentLows  = lows.slice(-3);

  // BULLISH: each swing high is higher than the last
  //          each swing low is higher than the last
  const isHH = recentHighs.length >= 2 &&
    recentHighs.every((h, i) => i === 0 || h.price > recentHighs[i-1].price);
  const isHL = recentLows.length >= 2 &&
    recentLows.every((l, i)  => i === 0 || l.price > recentLows[i-1].price);

  // BEARISH: each swing high is lower than the last
  //          each swing low is lower than the last
  const isLH = recentHighs.length >= 2 &&
    recentHighs.every((h, i) => i === 0 || h.price < recentHighs[i-1].price);
  const isLL = recentLows.length >= 2 &&
    recentLows.every((l, i)  => i === 0 || l.price < recentLows[i-1].price);

  if (isHH && isHL) {
    return {
      bias: 'BULLISH',
      structure: 'Higher Highs & Higher Lows',
      lastHH: recentHighs[recentHighs.length - 1],
      lastHL: recentLows[recentLows.length - 1],
      lastLH: null, lastLL: null,
    };
  }

  if (isLH && isLL) {
    return {
      bias: 'BEARISH',
      structure: 'Lower Highs & Lower Lows',
      lastHH: null, lastHL: null,
      lastLH: recentHighs[recentHighs.length - 1],
      lastLL: recentLows[recentLows.length - 1],
    };
  }

  return {
    bias: 'NEUTRAL',
    structure: 'Mixed structure — no clear bias',
    lastHH: null, lastHL: null, lastLH: null, lastLL: null,
  };
}

// ── BIAS STRENGTH ────────────────────────────────────

function calcStrength(
  highs: SwingPoint[],
  lows:  SwingPoint[],
  bias:  SLPBias
): BiasStrength {
  if (bias === 'NEUTRAL') return 'WEAK';

  const rH = highs.slice(-4);
  const rL = lows.slice(-4);

  let consecutiveCount = 0;
  if (bias === 'BULLISH') {
    for (let i = 1; i < Math.min(rH.length, rL.length); i++) {
      if (rH[i].price > rH[i-1].price && rL[i].price > rL[i-1].price) {
        consecutiveCount++;
      } else break;
    }
  } else {
    for (let i = 1; i < Math.min(rH.length, rL.length); i++) {
      if (rH[i].price < rH[i-1].price && rL[i].price < rL[i-1].price) {
        consecutiveCount++;
      } else break;
    }
  }

  if (consecutiveCount >= 3) return 'STRONG';
  if (consecutiveCount >= 2) return 'MODERATE';
  return 'WEAK';
}

// ── MASTER BIAS FUNCTION ─────────────────────────────

export function identifyPhase(candles: Candle[], bias: SLPBias): 'IMPULSE' | 'CORRECTION' | 'REVERSAL' | 'CONSOLIDATION' | 'CONTINUATION' {
  if (bias === 'NEUTRAL') return 'CONSOLIDATION';
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

export function predictNextMove(bias: SLPBias, phase: string, strength: BiasStrength): string {
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

export function analyseSLPBias(
  candles:   Candle[],
  timeframe: string
): SLPBiasResult {

  if (!candles || candles.length < 30) {
    return {
      bias: 'NEUTRAL', strength: 'WEAK',
      structure: 'Not enough candle data (need 30+)',
      swingHighs: [], swingLows: [],
      lastHH: null, lastHL: null, lastLH: null, lastLL: null,
      analysedAt: Date.now(), candleCount: candles?.length ?? 0,
      phase: 'CONSOLIDATION', nextMove: 'Need more candle data',
    };
  }

  const { highs, lows } = detectSwingPoints(candles, timeframe);
  const classification  = classifyBias(highs, lows);
  const strength        = calcStrength(highs, lows, classification.bias);
  const phase           = identifyPhase(candles, classification.bias);
  const nextMove        = predictNextMove(classification.bias, phase, strength);

  return {
    ...classification,
    strength,
    swingHighs:  highs.slice(-5),
    swingLows:   lows.slice(-5),
    analysedAt:  Date.now(),
    candleCount: candles.length,
    phase,
    nextMove,
  };
}
