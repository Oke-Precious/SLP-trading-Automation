import { Candle } from '../market/marketDataService';
import {
  SwingPoint, MSSEvent, BOSEvent, SLPStructureResult,
} from './slpMarketStructure';

export type InducementStatus = 'PENDING' | 'SWEPT' | 'INVALIDATED';

export type StructureTriggerKind = 'MSS' | 'BOS' | 'DBS';

export interface StructureTriggerEvent {
  kind:  StructureTriggerKind;
  event: MSSEvent | BOSEvent;
}

export interface InducementPoint {
  id:               string;
  time:             number;         // when the IDM swing point formed
  price:            number;         // the price level of the IDM
  swingType:        'HIGH' | 'LOW'; // HIGH for bearish IDM, LOW for bullish IDM
  direction:        'BULLISH' | 'BEARISH';  // the setup direction this IDM belongs to
  candleIndex:      number;
  originTrigger:    StructureTriggerEvent;  // the MSS/BOS/DBS this IDM followed
  originConfidence: 'STANDARD' | 'HIGH';    // HIGH if origin was a Double BOS
  status:           InducementStatus;
  sweptAt:          number | null;
  sweptCandleIndex: number | null;
  invalidatedAt:    number | null;
}

// Combine MSS and BOS events (including Double BOS) into a single
// chronological list of "trigger" events that can be followed by
// an inducement.
function collectTriggerEvents(
  structureResult: SLPStructureResult
): StructureTriggerEvent[] {
  const triggers: StructureTriggerEvent[] = [
    ...structureResult.mssEvents.map(e => ({
      kind: 'MSS' as StructureTriggerKind, event: e,
    })),
    ...structureResult.bosEvents.map(e => ({
      kind: (e.isDouble ? 'DBS' : 'BOS') as StructureTriggerKind, event: e,
    })),
  ];

  return triggers.sort((a, b) => a.event.time - b.event.time);
}

const MAX_CANDLES_TO_FIND_IDM = 30;   // don't search indefinitely

// For a BULLISH trigger: find the first swing LOW that forms after
// the trigger's candle index. This is the candidate inducement.
// For a BEARISH trigger: find the first swing HIGH that forms after
// the trigger's candle index.
function findPullbackSwing(
  trigger:    StructureTriggerEvent,
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[]
): SwingPoint | null {
  const triggerIndex = trigger.event.candleIndex;
  const direction = trigger.event.direction;

  if (direction === 'BULLISH') {
    const candidates = swingLows.filter(
      l => l.index > triggerIndex && l.index <= triggerIndex + MAX_CANDLES_TO_FIND_IDM
    );
    return candidates.length > 0 ? candidates[0] : null;
  } else {
    const candidates = swingHighs.filter(
      h => h.index > triggerIndex && h.index <= triggerIndex + MAX_CANDLES_TO_FIND_IDM
    );
    return candidates.length > 0 ? candidates[0] : null;
  }
}

// Walk forward candle-by-candle from the IDM swing point.
// The FIRST candle whose wick crosses the IDM level determines
// the outcome — check wick first, then check close on that SAME
// candle to classify sweep vs invalidation.
function evaluateIDMOutcome(
  idmSwing:  SwingPoint,
  direction: 'BULLISH' | 'BEARISH',
  candles:   Candle[]
): {
  status: InducementStatus;
  sweptAt: number | null;
  sweptCandleIndex: number | null;
  invalidatedAt: number | null;
} {
  for (let i = idmSwing.index + 1; i < candles.length; i++) {
    const c = candles[i];

    if (direction === 'BULLISH') {
      // Looking for price to dip below the IDM low
      if (c.low < idmSwing.price) {
        if (c.close < idmSwing.price) {
          // Closed below — this is an invalidation, not a sweep
          return {
            status: 'INVALIDATED', sweptAt: null,
            sweptCandleIndex: null, invalidatedAt: c.time,
          };
        } else {
          // Wicked below, closed above — valid sweep
          return {
            status: 'SWEPT', sweptAt: c.time,
            sweptCandleIndex: i, invalidatedAt: null,
          };
        }
      }
    } else {
      // BEARISH — looking for price to wick above the IDM high
      if (c.high > idmSwing.price) {
        if (c.close > idmSwing.price) {
          return {
            status: 'INVALIDATED', sweptAt: null,
            sweptCandleIndex: null, invalidatedAt: c.time,
          };
        } else {
          return {
            status: 'SWEPT', sweptAt: c.time,
            sweptCandleIndex: i, invalidatedAt: null,
          };
        }
      }
    }
  }

  // No candle has crossed the IDM level yet — still pending
  return {
    status: 'PENDING', sweptAt: null,
    sweptCandleIndex: null, invalidatedAt: null,
  };
}

export function detectInducements(
  candles:         Candle[],
  structureResult: SLPStructureResult
): InducementPoint[] {
  const triggers = collectTriggerEvents(structureResult);
  const results: InducementPoint[] = [];

  triggers.forEach((trigger, idx) => {
    const idmSwing = findPullbackSwing(
      trigger, structureResult.swingHighs, structureResult.swingLows
    );
    if (!idmSwing) return;

    const outcome = evaluateIDMOutcome(idmSwing, trigger.event.direction, candles);

    results.push({
      id:               `idm-${trigger.kind}-${idx}`,
      time:             idmSwing.time,
      price:            idmSwing.price,
      swingType:        idmSwing.type,
      direction:        trigger.event.direction,
      candleIndex:      idmSwing.index,
      originTrigger:    trigger,
      originConfidence: trigger.kind === 'DBS' ? 'HIGH' : 'STANDARD',
      status:           outcome.status,
      sweptAt:          outcome.sweptAt,
      sweptCandleIndex: outcome.sweptCandleIndex,
      invalidatedAt:    outcome.invalidatedAt,
    });
  });

  // Prioritize: most recent first, keep last 6
  return results.slice(-6);
}

// Convenience filter — only the inducements that are actually
// ready to be used for POI validation (Phase 4 will consume this)
export function getSweptInducements(
  inducements: InducementPoint[]
): InducementPoint[] {
  return inducements.filter(i => i.status === 'SWEPT');
}
