import { Candle } from '../market/marketDataService';
import { Timeframe } from './timeframeHierarchy';

export type TrendDirection = 'UPTREND' | 'DOWNTREND' | 'RANGING';

export interface SwingPoint {
  index:     number;
  time:      number;
  price:     number;
  type:      'HIGH' | 'LOW';
  label?:    'HH' | 'HL' | 'LH' | 'LL' | null;  // classified relative to prior swing
  confirmed?: boolean;
}

export interface MSSEvent {
  time:            number;
  price:           number;         // the swing level that got broken
  direction:       'BULLISH' | 'BEARISH';  // direction of the NEW trend forming
  brokenSwing?:    SwingPoint;     // the swing point (prior low/high) that was broken
  swingBroken?:    SwingPoint;     // legacy field for backward compatibility
  priorTrend?:     TrendDirection; // what trend was in place before this MSS
  candleIndex:     number;
  earlyWarning?:   SwingPoint | null;  // the LH (or HL) that first hinted at the shift, before the actual break — if detected
}

export interface BOSEvent {
  time:            number;
  price:           number;         // the swing level broken
  direction:       'BULLISH' | 'BEARISH';  // same direction as current trend
  brokenSwing:     SwingPoint;
  swingBroken?:    SwingPoint;     // legacy field for backward compatibility
  candleIndex:     number;
  isDouble:        boolean;        // true if this is part of a Double BOS sequence
  doubleSequence:  SwingPoint[];   // all swing levels taken out in this DBS move
  // For chart rendering — bounded line, not infinite:
  lineFrom:        number;         // = brokenSwing.time
  lineTo:          number;         // = this event's time
}

export interface SLPStructureResult {
  timeframe:       Timeframe;
  currentTrend:    TrendDirection;
  swingHighs:      SwingPoint[];
  swingLows:       SwingPoint[];
  mssEvents:       MSSEvent[];
  bosEvents:       BOSEvent[];
  doubleBOSEvents: BOSEvent[];     // subset of bosEvents where isDouble = true
  analysedAt:      number;
}

function getLookback(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1w': return 4;
    case '1d': return 5;
    case '4h': return 5;
    case '1h': return 3;
    case '30m': return 3;
    case '15m': return 2;
    case '5m': return 2;
    case '1m': return 2;
    default: return 3;
  }
}

export function detectSwingPoints(
  candles:   Candle[],
  timeframe: Timeframe
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const lookback = getLookback(timeframe);
  const rawHighs: SwingPoint[] = [];
  const rawLows:  SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    const leftWindow  = candles.slice(i - lookback, i);
    const rightWindow = candles.slice(i + 1, i + lookback + 1);

    const isSwingHigh =
      leftWindow.every(x => x.high < c.high) &&
      rightWindow.every(x => x.high < c.high);
    const isSwingLow =
      leftWindow.every(x => x.low > c.low) &&
      rightWindow.every(x => x.low > c.low);

    if (isSwingHigh) {
      rawHighs.push({ index: i, time: c.time, price: c.high, type: 'HIGH', label: null });
    }
    if (isSwingLow) {
      rawLows.push({ index: i, time: c.time, price: c.low, type: 'LOW', label: null });
    }
  }

  // Classify each swing relative to the PREVIOUS swing of the same type
  const highs = rawHighs.map((h, i) => {
    if (i === 0) return h;
    const label: SwingPoint['label'] = h.price > rawHighs[i-1].price ? 'HH' : 'LH';
    return { ...h, label };
  });
  const lows = rawLows.map((l, i) => {
    if (i === 0) return l;
    const label: SwingPoint['label'] = l.price > rawLows[i-1].price ? 'HL' : 'LL';
    return { ...l, label };
  });

  return { highs, lows };
}

export function classifyTrend(
  highs: SwingPoint[],
  lows:  SwingPoint[]
): TrendDirection {
  if (highs.length < 2 || lows.length < 2) return 'RANGING';

  const recentHighs = highs.slice(-3);
  const recentLows  = lows.slice(-3);

  const isUptrend = recentHighs.every(h => h.label === 'HH' || recentHighs.indexOf(h) === 0)
    && recentLows.every(l => l.label === 'HL' || recentLows.indexOf(l) === 0)
    && recentHighs.filter(h => h.label === 'HH').length >= 1
    && recentLows.filter(l => l.label === 'HL').length >= 1;

  const isDowntrend = recentHighs.every(h => h.label === 'LH' || recentHighs.indexOf(h) === 0)
    && recentLows.every(l => l.label === 'LL' || recentLows.indexOf(l) === 0)
    && recentHighs.filter(h => h.label === 'LH').length >= 1
    && recentLows.filter(l => l.label === 'LL').length >= 1;

  if (isUptrend) return 'UPTREND';
  if (isDowntrend) return 'DOWNTREND';
  return 'RANGING';
}

export function detectMSS(
  candles:   Candle[],
  highs:     SwingPoint[],
  lows:      SwingPoint[],
  timeframe: Timeframe
): MSSEvent[] {
  const events: MSSEvent[] = [];

  // Walk through candle history chronologically, tracking the
  // trend AS IT WAS KNOWN AT EACH POINT (no look-ahead)
  for (let i = 20; i < candles.length; i++) {
    const priorHighs = highs.filter(h => h.index < i);
    const priorLows  = lows.filter(l => l.index < i);
    if (priorHighs.length < 2 || priorLows.length < 2) continue;

    const priorTrend = classifyTrend(priorHighs, priorLows);
    const candle = candles[i];

    if (priorTrend === 'UPTREND') {
      // Look for price breaking BELOW the most recent swing low
      const lastLow = priorLows[priorLows.length - 1];
      if (candle.close < lastLow.price) {
        // Check if there was an early-warning LH before this break
        const recentHighs = priorHighs.slice(-2);
        const earlyWarning = recentHighs.find(h => h.label === 'LH') ?? null;

        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastLow.price) < lastLow.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time:         candle.time,
            price:        lastLow.price,
            direction:    'BEARISH',   // new trend forming is bearish
            brokenSwing:  lastLow,
            swingBroken:  lastLow,
            priorTrend:   'UPTREND',
            candleIndex:  i,
            earlyWarning,
          });
        }
      }
    }

    if (priorTrend === 'DOWNTREND') {
      // Look for price breaking ABOVE the most recent swing high
      const lastHigh = priorHighs[priorHighs.length - 1];
      if (candle.close > lastHigh.price) {
        const recentLows = priorLows.slice(-2);
        const earlyWarning = recentLows.find(l => l.label === 'HL') ?? null;

        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastHigh.price) < lastHigh.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time:         candle.time,
            price:        lastHigh.price,
            direction:    'BULLISH',   // new trend forming is bullish
            brokenSwing:  lastHigh,
            swingBroken:  lastHigh,
            priorTrend:   'DOWNTREND',
            candleIndex:  i,
            earlyWarning,
          });
        }
      }
    }
  }

  return events.slice(-5);  // most recent 5 MSS events
}

export function detectBOS(
  candles:   Candle[],
  highs:     SwingPoint[],
  lows:      SwingPoint[],
  timeframe: Timeframe
): BOSEvent[] {
  const events: BOSEvent[] = [];

  for (let i = 20; i < candles.length; i++) {
    const priorHighs = highs.filter(h => h.index < i);
    const priorLows  = lows.filter(l => l.index < i);
    if (priorHighs.length < 2 || priorLows.length < 2) continue;

    const priorTrend = classifyTrend(priorHighs, priorLows);
    const candle = candles[i];

    if (priorTrend === 'UPTREND') {
      // Bullish BOS: price closes above the most recent swing HIGH
      const lastHigh = priorHighs[priorHighs.length - 1];
      if (candle.close > lastHigh.price) {
        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastHigh.price) < lastHigh.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time: candle.time, price: lastHigh.price, direction: 'BULLISH',
            brokenSwing: lastHigh, swingBroken: lastHigh, candleIndex: i,
            isDouble: false, doubleSequence: [],
            lineFrom: lastHigh.time, lineTo: candle.time,
          });
        }
      }
    }

    if (priorTrend === 'DOWNTREND') {
      const lastLow = priorLows[priorLows.length - 1];
      if (candle.close < lastLow.price) {
        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastLow.price) < lastLow.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time: candle.time, price: lastLow.price, direction: 'BEARISH',
            brokenSwing: lastLow, swingBroken: lastLow, candleIndex: i,
            isDouble: false, doubleSequence: [],
            lineFrom: lastLow.time, lineTo: candle.time,
          });
        }
      }
    }
  }

  // ── Detect DOUBLE BOS: 2+ consecutive BOS events in the SAME
  //    direction with no trend reversal (no MSS) between them ──
  const marked = markDoubleBOS(events);

  return marked.slice(-6);
}

function markDoubleBOS(events: BOSEvent[]): BOSEvent[] {
  if (events.length < 2) return events;

  const result = [...events];
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    if (prev.direction === curr.direction) {
      // Consecutive same-direction BOS = Double BOS
      curr.isDouble = true;
      curr.doubleSequence = [prev.brokenSwing, curr.brokenSwing];
      // Also mark the previous one as part of the sequence
      if (!prev.isDouble) {
        prev.isDouble = true;
        prev.doubleSequence = [prev.brokenSwing];
      }
    }
  }
  return result;
}

export function analyseSLPStructure(
  candles:   Candle[],
  timeframe: Timeframe
): SLPStructureResult {
  if (!candles || candles.length < 40) {
    return {
      timeframe, currentTrend: 'RANGING',
      swingHighs: [], swingLows: [],
      mssEvents: [], bosEvents: [], doubleBOSEvents: [],
      analysedAt: Date.now(),
    };
  }

  const { highs, lows } = detectSwingPoints(candles, timeframe);
  const currentTrend = classifyTrend(highs, lows);
  const mssEvents = detectMSS(candles, highs, lows, timeframe);
  const bosEvents = detectBOS(candles, highs, lows, timeframe);
  const doubleBOSEvents = bosEvents.filter(e => e.isDouble);

  return {
    timeframe, currentTrend,
    swingHighs: highs.slice(-6), swingLows: lows.slice(-6),
    mssEvents, bosEvents, doubleBOSEvents,
    analysedAt: Date.now(),
  };
}
