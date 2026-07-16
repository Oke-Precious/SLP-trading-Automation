import { Candle } from "../market/marketDataService";
import { analyseSLPStructure, detectSwingPoints as newDetectSwingPoints } from "./slpMarketStructure";
import { Timeframe } from "./timeframeHierarchy";

export type SLPBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type BiasStrength = 'STRONG' | 'MODERATE' | 'WEAK';

export interface SwingPoint {
  index:     number;
  time:      number;
  price:     number;
  type:      'HIGH' | 'LOW';
  confirmed: boolean;
  label?:    'HH' | 'HL' | 'LH' | 'LL' | null;
}

export interface SLPBiasResult {
  bias:          SLPBias;
  strength:      BiasStrength;
  structure:     string;
  swingHighs:    SwingPoint[];
  swingLows:     SwingPoint[];
  lastHH:        SwingPoint | null;
  lastHL:        SwingPoint | null;
  lastLH:        SwingPoint | null;
  lastLL:        SwingPoint | null;
  analysedAt:    number;
  candleCount:   number;
  phase:         'IMPULSE' | 'CORRECTION' | 'REVERSAL' | 'CONSOLIDATION' | 'CONTINUATION';
  nextMove:      string;
}

function normalizeTimeframe(tf: string): Timeframe {
  const lower = tf.toLowerCase();
  if (lower === '1h') return '1h';
  if (lower === '4h') return '4h';
  if (lower === '1d') return '1d';
  if (lower === '1w') return '1w';
  return lower as Timeframe;
}

export function detectSwingPoints(candles: Candle[], timeframe: string): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const tf = normalizeTimeframe(timeframe);
  const raw = newDetectSwingPoints(candles, tf);
  const highs = raw.highs.map(h => ({ ...h, confirmed: true }));
  const lows = raw.lows.map(l => ({ ...l, confirmed: true }));
  return { highs, lows };
}

export function analyseSLPBias(candles: Candle[], timeframe: string): SLPBiasResult {
  if (!candles || candles.length < 40) {
    return {
      bias: 'NEUTRAL',
      strength: 'WEAK',
      structure: 'Not enough candle data (need 40+)',
      swingHighs: [],
      swingLows: [],
      lastHH: null,
      lastHL: null,
      lastLH: null,
      lastLL: null,
      analysedAt: Date.now(),
      candleCount: candles?.length ?? 0,
      phase: 'CONSOLIDATION',
      nextMove: 'Need more candle data',
    };
  }

  const tf = normalizeTimeframe(timeframe);
  const struct = analyseSLPStructure(candles, tf);
  
  let bias: SLPBias = 'NEUTRAL';
  let structure = 'Ranging / Consolidation';
  
  if (struct.currentTrend === 'UPTREND') {
    bias = 'BULLISH';
    structure = 'Uptrend: Higher Highs & Higher Lows';
  } else if (struct.currentTrend === 'DOWNTREND') {
    bias = 'BEARISH';
    structure = 'Downtrend: Lower Highs & Lower Lows';
  }

  const highs = struct.swingHighs.map(h => ({ ...h, confirmed: true }));
  const lows = struct.swingLows.map(l => ({ ...l, confirmed: true }));

  const lastHH = highs.find(h => h.label === 'HH') || null;
  const lastHL = lows.find(l => l.label === 'HL') || null;
  const lastLH = highs.find(h => h.label === 'LH') || null;
  const lastLL = lows.find(l => l.label === 'LL') || null;

  // Predict strength and phase based on recent structures and Double BOS
  const hasDoubleBOS = struct.doubleBOSEvents.length > 0;
  const strength: BiasStrength = hasDoubleBOS ? 'STRONG' : (bias !== 'NEUTRAL' ? 'MODERATE' : 'WEAK');
  
  // Phase mapping
  let phase: SLPBiasResult['phase'] = 'CONSOLIDATION';
  if (bias === 'BULLISH') {
    phase = hasDoubleBOS ? 'IMPULSE' : 'CONTINUATION';
  } else if (bias === 'BEARISH') {
    phase = hasDoubleBOS ? 'IMPULSE' : 'CONTINUATION';
  }

  const nextMove = hasDoubleBOS 
    ? (bias === 'BULLISH' ? 'Strong continuation up — target next HH (DBS Confirmed)' : 'Strong continuation down — target next LL (DBS Confirmed)')
    : (bias === 'BULLISH' ? 'Continuation up — target next HH' : bias === 'BEARISH' ? 'Continuation down — target next LL' : 'Wait for clear structure break');

  return {
    bias,
    strength,
    structure,
    swingHighs: highs,
    swingLows: lows,
    lastHH,
    lastHL,
    lastLH,
    lastLL,
    analysedAt: Date.now(),
    candleCount: candles.length,
    phase,
    nextMove
  };
}
