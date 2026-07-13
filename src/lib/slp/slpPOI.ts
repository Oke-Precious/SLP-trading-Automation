import { Candle } from '../market/marketDataService';
import { SwingPoint } from './slpBias';
import { BOSEvent, MSSEvent } from './slpStructure';
import { LiquidityLevel } from './slpLiquidity';

export type POIType = 'ORDER_BLOCK' | 'BREAKER_BLOCK';
export type POIStatus = 'ACTIVE' | 'MITIGATED';
export type POIDirection = 'BULLISH' | 'BEARISH';

export interface SLPValidation {
  rule1_triggeredStructure:   boolean;  // caused MSS or BOS
  rule2_protectedByLiquidity: boolean;  // has liquidity below (bull) or above (bear)
  rule3_unmitigated:          boolean;  // price has not returned to it
  rule4_closestToLiquidity:   boolean;  // is closest valid POI to swept liquidity
  allRulesPass:               boolean;  // ALL FOUR must be true
  failedRules:                string[]; // human-readable list of failed rules
}

export interface SLPPOI {
  id:            string;
  type:          POIType;
  direction:     POIDirection;
  priceTop:      number;      // top of the POI zone
  priceBottom:   number;      // bottom of the POI zone
  priceMid:      number;      // midpoint (50% level for entry)
  time:          number;      // timestamp of the POI candle
  status:        POIStatus;
  validation:    SLPValidation;
  triggerEvent:  MSSEvent | BOSEvent;  // which structure event this caused
  protectedBy:   LiquidityLevel | null;
  displayLabel:  string;      // e.g. "Bullish OB" or "Bearish BB"
}

// ── ORDER BLOCK DETECTION ────────────────────────────

function detectOrderBlocks(
  candles:    Candle[],
  mssEvents:  MSSEvent[],
  bosEvents:  BOSEvent[]
): Omit<SLPPOI, 'validation' | 'protectedBy'>[] {
  const pois: Omit<SLPPOI, 'validation' | 'protectedBy'>[] = [];
  const structureEvents = [...mssEvents, ...bosEvents];

  structureEvents.forEach(event => {
    const eventIndex = candles.findIndex(c => c.time === event.time);
    if (eventIndex < 2) return;

    if (event.direction === 'BULLISH') {
      // Look backwards from the event for the last bearish candle
      for (let i = eventIndex - 1; i >= Math.max(0, eventIndex - 15); i--) {
        const c = candles[i];
        if (c.close < c.open) {  // bearish candle
          const top    = Math.max(c.open, c.close);  // body high
          const bottom = Math.min(c.open, c.close);  // body low
          pois.push({
            id:           `bull-ob-${i}`,
            type:         'ORDER_BLOCK',
            direction:    'BULLISH',
            priceTop:     top,
            priceBottom:  bottom,
            priceMid:     (top + bottom) / 2,
            time:         c.time,
            status:       'ACTIVE',
            triggerEvent: event,
            displayLabel: 'Bullish OB',
          });
          break;  // only the LAST bearish candle, so stop here
        }
      }
    }

    if (event.direction === 'BEARISH') {
      for (let i = eventIndex - 1; i >= Math.max(0, eventIndex - 15); i--) {
        const c = candles[i];
        if (c.close > c.open) {  // bullish candle
          const top    = Math.max(c.open, c.close);
          const bottom = Math.min(c.open, c.close);
          pois.push({
            id:           `bear-ob-${i}`,
            type:         'ORDER_BLOCK',
            direction:    'BEARISH',
            priceTop:     top,
            priceBottom:  bottom,
            priceMid:     (top + bottom) / 2,
            time:         c.time,
            status:       'ACTIVE',
            triggerEvent: event,
            displayLabel: 'Bearish OB',
          });
          break;
        }
      }
    }
  });

  return pois;
}

// ── BREAKER BLOCK DETECTION ──────────────────────────

function detectBreakerBlocks(
  candles: Candle[],
  orderBlocks: Omit<SLPPOI, 'validation' | 'protectedBy'>[]
): Omit<SLPPOI, 'validation' | 'protectedBy'>[] {
  const currentPrice = candles[candles.length - 1].close;

  return orderBlocks
    .filter(ob => {
      if (ob.direction === 'BULLISH') {
        return currentPrice < ob.priceBottom;  // broke below the bullish OB
      } else {
        return currentPrice > ob.priceTop;     // broke above the bearish OB
      }
    })
    .map(ob => ({
      ...ob,
      id:           ob.id.replace('ob', 'bb'),
      type:         'BREAKER_BLOCK' as POIType,
      direction:    (ob.direction === 'BULLISH' ? 'BEARISH' : 'BULLISH') as POIDirection,
      status:       'ACTIVE' as POIStatus,
      displayLabel: ob.direction === 'BULLISH'
        ? 'Bearish BB (former Bull OB)'
        : 'Bullish BB (former Bear OB)',
    }));
}

// ── 4-RULE VALIDATION ────────────────────────────────

function validatePOI(
  poi:              Omit<SLPPOI, 'validation' | 'protectedBy'>,
  candles:          Candle[],
  liquidityLevels:  LiquidityLevel[],
  allPOIs:          Omit<SLPPOI, 'validation' | 'protectedBy'>[],
  lastSweptLiquidity: LiquidityLevel | null
): SLPValidation {
  const failedRules: string[] = [];

  // ─ RULE 1: Did this POI trigger a structure event? ─
  const rule1 = true;  // inherent from detection method

  // ─ RULE 2: Is the POI protected by liquidity? ─
  let rule2 = false;

  if (poi.direction === 'BULLISH') {
    const belowLiquidity = liquidityLevels.filter(
      l => l.side === 'SELL_SIDE' && l.price < poi.priceBottom && !l.swept
    );
    if (belowLiquidity.length > 0) {
      rule2 = true;
    }
  } else {
    const aboveLiquidity = liquidityLevels.filter(
      l => l.side === 'BUY_SIDE' && l.price > poi.priceTop && !l.swept
    );
    if (aboveLiquidity.length > 0) {
      rule2 = true;
    }
  }
  if (!rule2) failedRules.push('Rule 2: Not protected by liquidity');

  // ─ RULE 3: Is the POI unmitigated? ─
  const poiIndex = candles.findIndex(c => c.time >= poi.time);
  const candlesAfterPOI = candles.slice(poiIndex + 1);
  let rule3 = true;

  for (const c of candlesAfterPOI) {
    const priceMitigated =
      (poi.direction === 'BULLISH' && c.low <= poi.priceMid) ||
      (poi.direction === 'BEARISH' && c.high >= poi.priceMid);
    if (priceMitigated) {
      rule3 = false;
      break;
    }
  }
  if (!rule3) failedRules.push('Rule 3: POI has been mitigated');

  // ─ RULE 4: Is this the CLOSEST valid POI to swept liquidity? ─
  let rule4 = false;

  if (lastSweptLiquidity) {
    const otherValidPOIs = allPOIs.filter(
      p => p.id !== poi.id &&
           p.direction === poi.direction &&
           p.status !== 'MITIGATED'
    );
    const distanceToThisPOI = Math.abs(
      ((poi.priceTop + poi.priceBottom) / 2) - lastSweptLiquidity.price
    );
    const closerPOIExists = otherValidPOIs.some(p => {
      const dist = Math.abs(
        ((p.priceTop + p.priceBottom) / 2) - lastSweptLiquidity.price
      );
      return dist < distanceToThisPOI;
    });
    rule4 = !closerPOIExists;
  } else {
    failedRules.push('Rule 4: No swept liquidity detected yet — wait for sweep');
  }
  if (lastSweptLiquidity && !rule4) {
    failedRules.push('Rule 4: A closer valid POI exists — use that one instead');
  }

  return {
    rule1_triggeredStructure:   rule1,
    rule2_protectedByLiquidity: rule2,
    rule3_unmitigated:          rule3,
    rule4_closestToLiquidity:   rule4,
    allRulesPass:               rule1 && rule2 && rule3 && rule4,
    failedRules,
  };
}

// ── MASTER POI FUNCTION ──────────────────────────────

export function detectSLPPOIs(
  candles:          Candle[],
  mssEvents:        MSSEvent[],
  bosEvents:        BOSEvent[],
  liquidityLevels:  LiquidityLevel[]
): SLPPOI[] {
  // Find the most recently swept liquidity level
  const sweptLiquidity = liquidityLevels
    .filter(l => l.swept)
    .sort((a, b) => (b.sweptTime ?? 0) - (a.sweptTime ?? 0));
  const lastSweptLiquidity = sweptLiquidity[0] ?? null;

  // Detect raw OBs and BBs
  const rawOBs  = detectOrderBlocks(candles, mssEvents, bosEvents);
  const rawBBs  = detectBreakerBlocks(candles, rawOBs);
  const allRaw  = [...rawOBs, ...rawBBs];

  // Validate each against all 4 SLP rules
  const validated: SLPPOI[] = allRaw.map(poi => {
    const validation = validatePOI(
      poi, candles, liquidityLevels, allRaw, lastSweptLiquidity
    );
    const protectedBy = liquidityLevels.find(
      l => poi.direction === 'BULLISH'
        ? l.side === 'SELL_SIDE' && l.price < poi.priceBottom
        : l.side === 'BUY_SIDE'  && l.price > poi.priceTop
    ) ?? null;

    return { ...poi, validation, protectedBy };
  });

  // CRITICAL: only return POIs that PASS ALL 4 RULES
  return validated
    .filter(p => p.validation.allRulesPass)
    .slice(-3);  // show maximum 3 valid POIs at a time
}
