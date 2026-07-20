import { Candle } from '../market/marketDataService';
import { SLPStructureResult } from './slpMarketStructure';
import { StructureTriggerEvent } from './slpInducement';

export interface OrderBlockCandidate {
  id:                   string;
  direction:            'BULLISH' | 'BEARISH';
  obCandle:             Candle;       // Candle 1 — the OB candle itself
  obCandleIndex:        number;
  engulfingCandle:      Candle;       // Candle 2 — the engulfing candle
  engulfingCandleIndex: number;
  zoneTop:              number;       // top of the OB body zone
  zoneBottom:           number;       // bottom of the OB body zone
  entryLevel:           number;       // "demarcation" entry reference
  stopLossLevel:        number;       // far side of the OB
  originTrigger:        StructureTriggerEvent;  // the MSS/BOS/DBS this OB caused
  time:                 number;       // = obCandle.time
  displayLabel:         string;       // "Bullish OB" or "Bearish OB"
}

function isBullishEngulfing(candle1: Candle, candle2: Candle): boolean {
  const c1IsBearish = candle1.close < candle1.open;
  const c2IsBullish = candle2.close > candle2.open;
  const fullyEngulfs =
    candle2.open  <= candle1.close &&
    candle2.close >= candle1.open;
  return c1IsBearish && c2IsBullish && fullyEngulfs;
}

function isBearishEngulfing(candle1: Candle, candle2: Candle): boolean {
  const c1IsBullish = candle1.close > candle1.open;
  const c2IsBearish = candle2.close < candle2.open;
  const fullyEngulfs =
    candle2.open  >= candle1.close &&
    candle2.close <= candle1.open;
  return c1IsBullish && c2IsBearish && fullyEngulfs;
}

const MAX_CANDLES_TO_FIND_OB = 20;

function buildOrderBlock(
  candle1:      Candle,
  candle1Index: number,
  candle2:      Candle,
  candle2Index: number,
  direction:    'BULLISH' | 'BEARISH',
  trigger:      StructureTriggerEvent
): OrderBlockCandidate {
  const zoneTop    = Math.max(candle1.open, candle1.close);
  const zoneBottom = Math.min(candle1.open, candle1.close);
  const entryLevel = candle2.open;
  const stopLossLevel = direction === 'BULLISH' ? candle1.low : candle1.high;

  return {
    id:                   `ob-${direction.toLowerCase()}-${candle1Index}`,
    direction,
    obCandle:             candle1,
    obCandleIndex:        candle1Index,
    engulfingCandle:      candle2,
    engulfingCandleIndex: candle2Index,
    zoneTop,
    zoneBottom,
    entryLevel,
    stopLossLevel,
    originTrigger:        trigger,
    time:                 candle1.time,
    displayLabel:         direction === 'BULLISH' ? 'Bullish OB' : 'Bearish OB',
  };
}

function findOrderBlockForTrigger(
  trigger: StructureTriggerEvent,
  candles: Candle[]
): OrderBlockCandidate | null {
  const triggerIndex = trigger.event.candleIndex;
  const direction     = trigger.event.direction;
  const earliestIndex = Math.max(1, triggerIndex - MAX_CANDLES_TO_FIND_OB);

  for (let i = triggerIndex; i >= earliestIndex; i--) {
    const candle1 = candles[i - 1];
    const candle2 = candles[i];
    if (!candle1 || !candle2) continue;

    if (direction === 'BULLISH' && isBullishEngulfing(candle1, candle2)) {
      return buildOrderBlock(
        candle1, i - 1, candle2, i, 'BULLISH', trigger
      );
    }

    if (direction === 'BEARISH' && isBearishEngulfing(candle1, candle2)) {
      return buildOrderBlock(
        candle1, i - 1, candle2, i, 'BEARISH', trigger
      );
    }
  }

  return null;
}

export function detectOrderBlocks(
  candles:         Candle[],
  structureResult: SLPStructureResult
): OrderBlockCandidate[] {
  const triggers: StructureTriggerEvent[] = [
    ...structureResult.mssEvents.map(e => ({
      kind: 'MSS' as const, event: e,
    })),
    ...structureResult.bosEvents.map(e => ({
      kind: (e.isDouble ? 'DBS' : 'BOS') as 'DBS' | 'BOS', event: e,
    })),
  ].sort((a, b) => a.event.time - b.event.time);

  const results: OrderBlockCandidate[] = [];
  const seenCandleIndices = new Set<number>();

  triggers.forEach(trigger => {
    const ob = findOrderBlockForTrigger(trigger, candles);
    if (ob && !seenCandleIndices.has(ob.obCandleIndex)) {
      results.push(ob);
      seenCandleIndices.add(ob.obCandleIndex);
    }
  });

  return results.slice(-8);
}
