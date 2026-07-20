import { Candle } from '../market/marketDataService';
import { SLPStructureResult } from './slpMarketStructure';
import { InducementPoint, StructureTriggerEvent } from './slpInducement';
import { OrderBlockCandidate } from './slpOrderBlock';

export type SLPPOIType = 'ORDER_BLOCK' | 'BREAKER_BLOCK';

export interface SLPPOIValidation {
  rule1_validTrigger:          boolean;
  rule1_note:                  string;
  rule2_hasSweptInducement:    boolean;
  rule2_inducementRef:         InducementPoint | null;
  rule3_unmitigated:           boolean;
  rule3_violationDetail:       string | null;
  rule4_isClosestToInducement: boolean;
  allRulesPass:                boolean;
  failedRules:                 string[];
}

export interface SLPPOI {
  id:              string;
  type:            SLPPOIType;
  direction:       'BULLISH' | 'BEARISH';   // for BB, this is the NEW (flipped) direction
  zoneTop:         number;
  zoneBottom:      number;
  entryLevel:      number;
  stopLossLevel:   number;
  time:            number;
  sourceOB:        OrderBlockCandidate;
  originTrigger:   StructureTriggerEvent;
  breakerFlipTime: number | null;   // when it flipped, if this is a Breaker Block
  validation:      SLPPOIValidation;
  displayLabel:    string;
}

function detectBreakerBlocks(
  orderBlocks: OrderBlockCandidate[],
  candles:     Candle[]
): SLPPOI[] {
  const breakers: SLPPOI[] = [];

  orderBlocks.forEach(ob => {
    // Walk forward from the OB to find the FIRST candle whose CLOSE
    // fully breaks through the zone (not just a wick)
    for (let i = ob.obCandleIndex + 1; i < candles.length; i++) {
      const c = candles[i];
      const brokenThrough = ob.direction === 'BULLISH'
        ? c.close < ob.zoneBottom   // closed fully below a bullish OB
        : c.close > ob.zoneTop;     // closed fully above a bearish OB

      if (brokenThrough) {
        const flippedDirection = ob.direction === 'BULLISH' ? 'BEARISH' : 'BULLISH';
        breakers.push({
          id:              `bb-${ob.id}`,
          type:            'BREAKER_BLOCK',
          direction:       flippedDirection,
          zoneTop:         ob.zoneTop,
          zoneBottom:      ob.zoneBottom,
          entryLevel:      ob.entryLevel,
          stopLossLevel:   ob.stopLossLevel,
          time:            ob.time,
          sourceOB:        ob,
          originTrigger:   ob.originTrigger,
          breakerFlipTime: c.time,
          validation:      null as unknown as SLPPOIValidation,  // filled in later
          displayLabel:    flippedDirection === 'BULLISH'
            ? 'Bullish BB (former Bearish OB)'
            : 'Bearish BB (former Bullish OB)',
        });
        break;   // only the first break-through matters
      }
    }
  });

  return breakers;
}

function checkUnmitigated(
  zoneTop:    number,
  zoneBottom: number,
  startIndex: number,
  candles:    Candle[]
): { unmitigated: boolean; violationDetail: string | null } {
  for (let i = startIndex + 1; i < candles.length; i++) {
    const c = candles[i];
    const bodyTop    = Math.max(c.open, c.close);
    const bodyBottom = Math.min(c.open, c.close);

    // Does the candle BODY overlap the zone at all?
    const bodyOverlapsZone = bodyTop >= zoneBottom && bodyBottom <= zoneTop;
    if (bodyOverlapsZone) {
      return {
        unmitigated: false,
        violationDetail:
          `Candle body overlapped the zone at index ${i} (time: ${c.time})`,
      };
    }
  }
  return { unmitigated: true, violationDetail: null };
}

function validateRules123(
  poi:         SLPPOI,
  candles:     Candle[],
  inducements: InducementPoint[]
): SLPPOIValidation {
  const failedRules: string[] = [];

  // RULE 1
  const triggerKind = poi.originTrigger.kind;
  const rule1 = triggerKind === 'MSS' || triggerKind === 'DBS';
  const rule1Note = rule1
    ? `Origin trigger: ${triggerKind} — satisfies Rule 1`
    : `Origin trigger: BOS (plain) — Rule 1 requires MSS or DBS. ` +
      `Flagged as provisional; verify against source material whether ` +
      `plain BOS-triggered POIs should also qualify.`;
  if (!rule1) failedRules.push('Rule 1: Origin trigger is not MSS or Double BOS');

  // RULE 2
  // For matching inducement, we look for an inducement of the same origin trigger direction
  const originalDirection = poi.originTrigger.event.direction;
  const matchingInducement = inducements.find(idm =>
    idm.originTrigger.event.time === poi.originTrigger.event.time &&
    idm.direction === originalDirection &&
    idm.status === 'SWEPT'
  ) ?? null;
  
  const rule2 = matchingInducement !== null;
  if (!rule2) {
    const anyMatch = inducements.find(idm =>
      idm.originTrigger.event.time === poi.originTrigger.event.time &&
      idm.direction === originalDirection
    );
    const statusNote = anyMatch ? `found but status is ${anyMatch.status}` : 'none found';
    failedRules.push(`Rule 2: No SWEPT inducement for this POI's structure event (${statusNote})`);
  }

  // RULE 3 — start checking from OB formation (engulfing candle), or from breaker flip time if BB
  const startIndex = poi.type === 'BREAKER_BLOCK' && poi.breakerFlipTime !== null
    ? candles.findIndex(c => c.time === poi.breakerFlipTime)
    : poi.sourceOB.engulfingCandleIndex;

  const { unmitigated, violationDetail } = checkUnmitigated(
    poi.zoneTop, poi.zoneBottom, startIndex, candles
  );
  if (!unmitigated && violationDetail) failedRules.push(`Rule 3: ${violationDetail}`);

  return {
    rule1_validTrigger:          rule1,
    rule1_note:                  rule1Note,
    rule2_hasSweptInducement:    rule2,
    rule2_inducementRef:         matchingInducement,
    rule3_unmitigated:           unmitigated,
    rule3_violationDetail:       violationDetail,
    rule4_isClosestToInducement: false,   // computed in the next step
    allRulesPass:                false,   // computed after Rule 4 is applied
    failedRules,
  };
}

function applyRule4(candidates: SLPPOI[]): SLPPOI[] {
  const passedFirstThree = candidates.filter(p =>
    p.validation.rule1_validTrigger &&
    p.validation.rule2_hasSweptInducement &&
    p.validation.rule3_unmitigated
  );

  const failedEarly = candidates.filter(p => !passedFirstThree.includes(p));
  failedEarly.forEach(p => { p.validation.allRulesPass = false; });

  const byDirection: Record<string, SLPPOI[]> = {};
  passedFirstThree.forEach(p => {
    if (!byDirection[p.direction]) byDirection[p.direction] = [];
    byDirection[p.direction].push(p);
  });

  const finalResults: SLPPOI[] = [];

  Object.values(byDirection).forEach(group => {
    const withDistance = group.map(p => {
      const idmPrice = p.validation.rule2_inducementRef?.price ?? null;
      const poiMid   = (p.zoneTop + p.zoneBottom) / 2;
      const distance = idmPrice !== null ? Math.abs(poiMid - idmPrice) : Infinity;
      return { poi: p, distance };
    });

    withDistance.sort((a, b) => a.distance - b.distance);

    withDistance.forEach((item, idx) => {
      const isClosest = idx === 0;
      item.poi.validation.rule4_isClosestToInducement = isClosest;
      item.poi.validation.allRulesPass = isClosest;
      if (!isClosest) {
        item.poi.validation.failedRules.push(
          'Rule 4: A closer valid POI exists relative to the swept inducement'
        );
      }
      finalResults.push(item.poi);
    });
  });

  return [...finalResults, ...failedEarly];
}

export function detectSLPPOIs(
  candles:         Candle[],
  structureResult: SLPStructureResult,
  orderBlocks:     OrderBlockCandidate[],
  inducements:     InducementPoint[]
): SLPPOI[] {
  const breakerBlocks = detectBreakerBlocks(orderBlocks, candles);

  const obAsPOIs: SLPPOI[] = orderBlocks.map(ob => ({
    id:              ob.id,
    type:            'ORDER_BLOCK' as const,
    direction:       ob.direction,
    zoneTop:         ob.zoneTop,
    zoneBottom:      ob.zoneBottom,
    entryLevel:      ob.entryLevel,
    stopLossLevel:   ob.stopLossLevel,
    time:            ob.time,
    sourceOB:        ob,
    originTrigger:   ob.originTrigger,
    breakerFlipTime: null,
    validation:      null as unknown as SLPPOIValidation,
    displayLabel:    ob.displayLabel,
  }));

  const allCandidates = [...obAsPOIs, ...breakerBlocks];

  const validated = allCandidates.map(poi => ({
    ...poi,
    validation: validateRules123(poi, candles, inducements),
  }));

  return applyRule4(validated).slice(-10);  // cap total tracked candidates
}

export function getValidSLPPOIs(pois: SLPPOI[]): SLPPOI[] {
  return pois.filter(p => p.validation.allRulesPass);
}
