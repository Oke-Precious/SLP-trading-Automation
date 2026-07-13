import { SwingPoint, SLPBias } from './slpBias';
import { Candle } from '../market/marketDataService';

export interface MSSEvent {
  time:        number;      // timestamp of the MSS candle
  price:       number;      // price at which MSS occurred
                            // (the swing level that was first crossed)
  direction:   'BULLISH' | 'BEARISH';
  swingBroken: SwingPoint;  // the swing point that was crossed
  candleIndex: number;
}

export interface BOSEvent {
  time:         number;
  price:        number;      // price level of the swing that was broken
  direction:    'BULLISH' | 'BEARISH';
  mssReference: MSSEvent;    // the MSS that preceded this BOS
  swingBroken:  SwingPoint;  // the swing point that was broken
  candleIndex:  number;
  // How to draw this on chart:
  // Draw a horizontal line FROM swingBroken.time
  // TO the candle at this BOSEvent.time
  // Label at the END of the line (at breakTime)
  lineFrom:     number;      // = swingBroken.time
  lineTo:       number;      // = this event's time
}

export interface SLPStructureResult {
  mssEvents: MSSEvent[];
  bosEvents: BOSEvent[];
}

// ── MSS DETECTION ────────────────────────────────────

function detectMSS(
  candles:    Candle[],
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  bias:       SLPBias
): MSSEvent[] {
  const events: MSSEvent[] = [];
  if (bias === 'NEUTRAL') return events;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    if (bias === 'BULLISH') {
      // Find the most recent swing HIGH before candle[i]
      const prevHighs = swingHighs.filter(h => h.index < i);
      if (prevHighs.length === 0) continue;
      const lastHigh = prevHighs[prevHighs.length - 1];

      // MSS: candle closes ABOVE that swing high
      if (candle.close > lastHigh.price) {
        // Only record if no MSS already recorded at this swing level
        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastHigh.price) < lastHigh.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time:        candle.time,
            price:       lastHigh.price,
            direction:   'BULLISH',
            swingBroken: lastHigh,
            candleIndex: i,
          });
        }
      }
    }

    if (bias === 'BEARISH') {
      // Find the most recent swing LOW before candle[i]
      const prevLows = swingLows.filter(l => l.index < i);
      if (prevLows.length === 0) continue;
      const lastLow = prevLows[prevLows.length - 1];

      // MSS: candle closes BELOW that swing low
      if (candle.close < lastLow.price) {
        const alreadyRecorded = events.some(
          e => Math.abs(e.price - lastLow.price) < lastLow.price * 0.001
        );
        if (!alreadyRecorded) {
          events.push({
            time:        candle.time,
            price:       lastLow.price,
            direction:   'BEARISH',
            swingBroken: lastLow,
            candleIndex: i,
          });
        }
      }
    }
  }

  return events.slice(-5);  // keep last 5 MSS events
}

// ── BOS DETECTION ────────────────────────────────────

function detectBOS(
  candles:    Candle[],
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  mssEvents:  MSSEvent[],
  bias:       SLPBias
): BOSEvent[] {
  const bosEvents: BOSEvent[] = [];
  const MAX_CANDLES_AFTER_MSS = 50;

  mssEvents.forEach(mss => {
    const startIdx = mss.candleIndex + 1;
    const endIdx   = Math.min(startIdx + MAX_CANDLES_AFTER_MSS, candles.length);

    if (bias === 'BULLISH') {
      // After bullish MSS, look for swing highs that form
      // AFTER the MSS candle and then get broken
      const postMSSHighs = swingHighs.filter(
        h => h.index > mss.candleIndex && h.index < endIdx
      );
      if (postMSSHighs.length === 0) return;

      // Take the HIGHEST swing high after MSS as the BOS target
      const targetSwing = postMSSHighs.reduce(
        (max, h) => h.price > max.price ? h : max
      );

      // Check if any candle after this swing CLOSES above it
      for (let i = targetSwing.index + 1; i < endIdx; i++) {
        if (candles[i].close > targetSwing.price) {
          bosEvents.push({
            time:         candles[i].time,
            price:        targetSwing.price,
            direction:    'BULLISH',
            mssReference: mss,
            swingBroken:  targetSwing,
            candleIndex:  i,
            lineFrom:     targetSwing.time,
            lineTo:       candles[i].time,
          });
          break;  // one BOS per MSS
        }
      }
    }

    if (bias === 'BEARISH') {
      const postMSSLows = swingLows.filter(
        l => l.index > mss.candleIndex && l.index < endIdx
      );
      if (postMSSLows.length === 0) return;

      const targetSwing = postMSSLows.reduce(
        (min, l) => l.price < min.price ? l : min
      );

      for (let i = targetSwing.index + 1; i < endIdx; i++) {
        if (candles[i].close < targetSwing.price) {
          bosEvents.push({
            time:         candles[i].time,
            price:        targetSwing.price,
            direction:    'BEARISH',
            mssReference: mss,
            swingBroken:  targetSwing,
            candleIndex:  i,
            lineFrom:     targetSwing.time,
            lineTo:       candles[i].time,
          });
          break;
        }
      }
    }
  });

  return bosEvents.slice(-4);  // show last 4 BOS events max
}

// ── MASTER STRUCTURE FUNCTION ────────────────────────

export function detectSLPStructure(
  candles:    Candle[],
  timeframe:  string,
  bias:       SLPBias,
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[]
): SLPStructureResult {
  if (bias === 'NEUTRAL' || candles.length < 30) {
    return { mssEvents: [], bosEvents: [] };
  }

  const mssEvents = detectMSS(candles, swingHighs, swingLows, bias);
  const bosEvents = detectBOS(candles, swingHighs, swingLows, mssEvents, bias);

  return { mssEvents, bosEvents };
}
