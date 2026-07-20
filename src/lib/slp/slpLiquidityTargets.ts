import { Candle } from '../market/marketDataService';
import { SwingPoint, TrendDirection, MSSEvent, SLPStructureResult } from './slpMarketStructure';
import { SLPPOI } from './slpPOI';

export interface TrendlineLiquidity {
  kind:         'TRENDLINE';
  direction:    'ASCENDING' | 'DESCENDING';
  anchorPoints: SwingPoint[];
  originPoint:  SwingPoint;     // the target price for a reversal trade
  slope:        number;
}

export interface EqualLevelLiquidity {
  kind:        'EQUAL_HIGHS' | 'EQUAL_LOWS';
  price:       number;
  touchPoints: SwingPoint[];
  touchCount:  number;
}

export interface RangeLiquidity {
  kind:      'RANGE_HIGH' | 'RANGE_LOW';
  price:     number;
  rangeHigh: number;
  rangeLow:  number;
}

export interface LastSwingLiquidity {
  kind:        'LAST_SWING_HIGH' | 'LAST_SWING_LOW';
  price:       number;
  swingPoint:  SwingPoint;
}

export type LiquidityTarget =
  | TrendlineLiquidity | EqualLevelLiquidity | RangeLiquidity | LastSwingLiquidity;

export interface TakeProfitSelection {
  target:          LiquidityTarget | null;
  targetPrice:     number;
  selectionReason: string;
  priorityRank:    1 | 2 | 3 | 4 | 5;
}

function calculateSlope(points: SwingPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0];
  const last  = points[points.length - 1];
  if (last.time === first.time) return 0;
  return (last.price - first.price) / (last.time - first.time);
}

// Detects the trendline that existed BEFORE a given candle index —
// used specifically to find the PRIOR trend's trendline when
// evaluating a reversal (MSS-originated) trade.
export function detectPriorTrendline(
  swingHighs:  SwingPoint[],
  swingLows:   SwingPoint[],
  priorTrend:  TrendDirection,
  beforeIndex: number
): TrendlineLiquidity | null {
  if (priorTrend === 'UPTREND') {
    const priorLows = swingLows.filter(l => l.index < beforeIndex).slice(-4);
    if (priorLows.length < 3) return null;
    const isAscending = priorLows.every((l, i) => i === 0 || l.price > priorLows[i-1].price);
    if (!isAscending) return null;
    return {
      kind: 'TRENDLINE', direction: 'ASCENDING',
      anchorPoints: priorLows, originPoint: priorLows[0],
      slope: calculateSlope(priorLows),
    };
  }

  if (priorTrend === 'DOWNTREND') {
    const priorHighs = swingHighs.filter(h => h.index < beforeIndex).slice(-4);
    if (priorHighs.length < 3) return null;
    const isDescending = priorHighs.every((h, i) => i === 0 || h.price < priorHighs[i-1].price);
    if (!isDescending) return null;
    return {
      kind: 'TRENDLINE', direction: 'DESCENDING',
      anchorPoints: priorHighs, originPoint: priorHighs[0],
      slope: calculateSlope(priorHighs),
    };
  }

  return null;
}

export function detectEqualLevels(
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  atr:        number
): EqualLevelLiquidity[] {
  const tolerance = atr * 0.15;
  const results: EqualLevelLiquidity[] = [];

  const visitedH = new Set<number>();
  swingHighs.forEach((h, i) => {
    if (visitedH.has(i)) return;
    const matches = swingHighs.filter((h2, j) =>
      i !== j && !visitedH.has(j) && Math.abs(h2.price - h.price) <= tolerance
    );
    if (matches.length >= 1) {
      matches.forEach(m => {
        const idx = swingHighs.indexOf(m);
        if (idx !== -1) visitedH.add(idx);
      });
      visitedH.add(i);
      const allPoints = [h, ...matches];
      const avgPrice = allPoints.reduce((s, p) => s + p.price, 0) / allPoints.length;
      results.push({
        kind: 'EQUAL_HIGHS', price: avgPrice,
        touchPoints: allPoints, touchCount: allPoints.length,
      });
    }
  });

  const visitedL = new Set<number>();
  swingLows.forEach((l, i) => {
    if (visitedL.has(i)) return;
    const matches = swingLows.filter((l2, j) =>
      i !== j && !visitedL.has(j) && Math.abs(l2.price - l.price) <= tolerance
    );
    if (matches.length >= 1) {
      matches.forEach(m => {
        const idx = swingLows.indexOf(m);
        if (idx !== -1) visitedL.add(idx);
      });
      visitedL.add(i);
      const allPoints = [l, ...matches];
      const avgPrice = allPoints.reduce((s, p) => s + p.price, 0) / allPoints.length;
      results.push({
        kind: 'EQUAL_LOWS', price: avgPrice,
        touchPoints: allPoints, touchCount: allPoints.length,
      });
    }
  });

  return results;
}

export function detectRangingLiquidity(
  candles:         Candle[],
  currentTrend:    TrendDirection,
  lookbackCandles: number = 40
): { rangeHigh: RangeLiquidity; rangeLow: RangeLiquidity } | null {
  if (currentTrend !== 'RANGING') return null;

  const recent = candles.slice(-lookbackCandles);
  if (recent.length === 0) return null;

  const rangeHigh = Math.max(...recent.map(c => c.high));
  const rangeLow  = Math.min(...recent.map(c => c.low));

  return {
    rangeHigh: { kind: 'RANGE_HIGH', price: rangeHigh, rangeHigh, rangeLow },
    rangeLow:  { kind: 'RANGE_LOW',  price: rangeLow,  rangeHigh, rangeLow },
  };
}

export function getLastSwingFallback(
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  direction:  'BULLISH' | 'BEARISH'
): LastSwingLiquidity | null {
  if (direction === 'BULLISH') {
    const lastHigh = swingHighs[swingHighs.length - 1];
    if (!lastHigh) return null;
    return { kind: 'LAST_SWING_HIGH', price: lastHigh.price, swingPoint: lastHigh };
  } else {
    const lastLow = swingLows[swingLows.length - 1];
    if (!lastLow) return null;
    return { kind: 'LAST_SWING_LOW', price: lastLow.price, swingPoint: lastLow };
  }
}

export function selectTakeProfitTarget(
  candles:         Candle[],
  structureResult: SLPStructureResult,
  poi:             SLPPOI,
  atr:             number
): TakeProfitSelection {
  const direction = poi.direction;
  const { swingHighs, swingLows, currentTrend } = structureResult;
  const originIsReversal = poi.originTrigger?.kind === 'MSS';

  // ── PRIORITY 1: Trend-Line Liquidity (reversal trades only) ──
  if (originIsReversal && poi.originTrigger?.event) {
    const mssEvent = poi.originTrigger.event as MSSEvent;
    const priorTrendDirection = mssEvent.priorTrend || (mssEvent.direction === 'BULLISH' ? 'DOWNTREND' : 'UPTREND');
    const trendline = detectPriorTrendline(
      swingHighs, swingLows, priorTrendDirection, mssEvent.candleIndex
    );
    if (trendline) {
      return {
        target: trendline,
        targetPrice: trendline.originPoint.price,
        selectionReason:
          `Reversal setup (MSS origin) — targeting the origin point of the ` +
          `prior ${priorTrendDirection.toLowerCase()}'s trendline`,
        priorityRank: 1,
      };
    }
  }

  // ── PRIORITY 2: Equal Highs / Equal Lows ──
  const equalLevels = detectEqualLevels(swingHighs, swingLows, atr);
  const relevantEqualLevels = direction === 'BULLISH'
    ? equalLevels.filter(l => l.kind === 'EQUAL_HIGHS' && l.price > poi.entryLevel)
    : equalLevels.filter(l => l.kind === 'EQUAL_LOWS'  && l.price < poi.entryLevel);

  if (relevantEqualLevels.length > 0) {
    const nearest = relevantEqualLevels.reduce((closest, l) =>
      Math.abs(l.price - poi.entryLevel) < Math.abs(closest.price - poi.entryLevel) ? l : closest
    );
    return {
      target: nearest,
      targetPrice: nearest.price,
      selectionReason:
        `Nearest ${nearest.kind === 'EQUAL_HIGHS' ? 'Equal Highs' : 'Equal Lows'} ` +
        `cluster (touched ${nearest.touchCount}x)`,
      priorityRank: 2,
    };
  }

  // ── PRIORITY 3: Ranging Liquidity ──
  const ranging = detectRangingLiquidity(candles, currentTrend);
  if (ranging) {
    const target = direction === 'BULLISH' ? ranging.rangeHigh : ranging.rangeLow;
    return {
      target,
      targetPrice: target.price,
      selectionReason: `Market is ranging — targeting the opposite side of the range`,
      priorityRank: 3,
    };
  }

  // ── PRIORITY 4: Fallback — Last Swing High/Low ──
  const fallback = getLastSwingFallback(swingHighs, swingLows, direction);
  if (fallback) {
    return {
      target: fallback,
      targetPrice: fallback.price,
      selectionReason:
        `No trendline, equal-level, or range target available — using nearest ` +
        `swing point as fallback draw on liquidity`,
      priorityRank: 4,
    };
  }

  // ── PRIORITY 5: Absolute fallback — default 2R target ──
  const riskDistance = Math.abs(poi.entryLevel - poi.stopLossLevel);
  const defaultTarget = direction === 'BULLISH'
    ? poi.entryLevel + riskDistance * 2
    : poi.entryLevel - riskDistance * 2;

  return {
    target: null,
    targetPrice: defaultTarget,
    selectionReason: `No liquidity target found by any method — using default 2R target`,
    priorityRank: 5,
  };
}
