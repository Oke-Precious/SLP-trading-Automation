import { Candle } from '../market/marketDataService';
import { SwingPoint } from './slpBias';

export type LiquidityType =
  | 'EQUAL_HIGHS'         // Type 2: equal highs
  | 'EQUAL_LOWS'          // Type 2: equal lows
  | 'INDUCEMENT_HIGH'     // Type 4: minor high between major highs
  | 'INDUCEMENT_LOW'      // Type 4: minor low between major lows

// Note: Type 1 (Trendline) is drawn manually by the user —
// it cannot be auto-detected reliably, so it is a
// manual drawing tool, not an auto-detector.

export interface LiquidityLevel {
  id:           string;
  type:         LiquidityType;
  price:        number;       // the price level of the liquidity
  priceRange:   [number, number];  // [min, max] tolerance band
  time:         number;       // when this liquidity was identified
  swept:        boolean;      // has price traded through this level?
  sweptTime:    number | null;
  touchCount:   number;       // how many times was this level formed?
  side:         'BUY_SIDE' | 'SELL_SIDE';
    // BUY_SIDE = above price (short sellers' stops)
    // SELL_SIDE = below price (long buyers' stops)
}

// ── TYPE 2: EQUAL HIGHS / EQUAL LOWS ─────────────────

function detectEqualHighsLows(
  candles:    Candle[],
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  atr:        number
): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const tolerance = atr * 0.15;
  const currentPrice = candles[candles.length - 1].close;

  // Equal Highs
  const visitedH = new Set<number>();
  swingHighs.forEach((h, i) => {
    if (visitedH.has(i)) return;
    const matches = swingHighs.filter((h2, j) => {
      if (i === j || visitedH.has(j)) return false;
      return Math.abs(h2.price - h.price) <= tolerance;
    });
    if (matches.length >= 1) {
      matches.forEach((_, j) => visitedH.add(swingHighs.indexOf(matches[j])));
      visitedH.add(i);
      const allPrices = [h.price, ...matches.map(m => m.price)];
      const avgPrice  = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const swept     = currentPrice > avgPrice;
      levels.push({
        id:         `eqh-${i}`,
        type:       'EQUAL_HIGHS',
        price:      avgPrice,
        priceRange: [avgPrice - tolerance, avgPrice + tolerance],
        time:       h.time,
        swept,
        sweptTime:  swept ? candles[candles.length - 1].time : null,
        touchCount: allPrices.length,
        side:       'BUY_SIDE',
      });
    }
  });

  // Equal Lows — mirror pattern
  const visitedL = new Set<number>();
  swingLows.forEach((l, i) => {
    if (visitedL.has(i)) return;
    const matches = swingLows.filter((l2, j) => {
      if (i === j || visitedL.has(j)) return false;
      return Math.abs(l2.price - l.price) <= tolerance;
    });
    if (matches.length >= 1) {
      matches.forEach((_, j) => visitedL.add(swingLows.indexOf(matches[j])));
      visitedL.add(i);
      const allPrices = [l.price, ...matches.map(m => m.price)];
      const avgPrice  = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const swept     = currentPrice < avgPrice;
      levels.push({
        id:         `eql-${i}`,
        type:       'EQUAL_LOWS',
        price:      avgPrice,
        priceRange: [avgPrice - tolerance, avgPrice + tolerance],
        time:       l.time,
        swept,
        sweptTime:  swept ? candles[candles.length - 1].time : null,
        touchCount: allPrices.length,
        side:       'SELL_SIDE',
      });
    }
  });

  return levels;
}

// ── TYPE 4: INDUCEMENT ───────────────────────────────

function detectInducement(
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  candles:    Candle[],
  atr:        number,
  bias:       string
): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const currentPrice = candles[candles.length - 1].close;

  if (bias === 'BULLISH' || bias === 'NEUTRAL') {
    // Bullish inducement: minor swing LOW between two major swing lows
    for (let i = 1; i < swingLows.length - 1; i++) {
      const prev = swingLows[i - 1];
      const curr = swingLows[i];
      const next = swingLows[i + 1];
      // "Minor" = the middle low is HIGHER than the surrounding ones
      const isMinor = curr.price > prev.price && curr.price > next.price;
      // "Small" = the difference is less than 1x ATR
      const isSmall = (curr.price - Math.min(prev.price, next.price)) < atr;
      if (isMinor && isSmall) {
        const swept = currentPrice < curr.price;
        levels.push({
          id:         `indu-low-${i}`,
          type:       'INDUCEMENT_LOW',
          price:      curr.price,
          priceRange: [curr.price - atr * 0.05, curr.price + atr * 0.05],
          time:       curr.time,
          swept,
          sweptTime:  null,
          touchCount: 1,
          side:       'SELL_SIDE',
        });
      }
    }
  }

  if (bias === 'BEARISH' || bias === 'NEUTRAL') {
    // Bearish inducement: minor swing HIGH between two major swing highs
    for (let i = 1; i < swingHighs.length - 1; i++) {
      const prev = swingHighs[i - 1];
      const curr = swingHighs[i];
      const next = swingHighs[i + 1];
      const isMinor = curr.price < prev.price && curr.price < next.price;
      const isSmall = (Math.max(prev.price, next.price) - curr.price) < atr;
      if (isMinor && isSmall) {
        const swept = currentPrice > curr.price;
        levels.push({
          id:         `indu-high-${i}`,
          type:       'INDUCEMENT_HIGH',
          price:      curr.price,
          priceRange: [curr.price - atr * 0.05, curr.price + atr * 0.05],
          time:       curr.time,
          swept,
          sweptTime:  null,
          touchCount: 1,
          side:       'BUY_SIDE',
        });
      }
    }
  }

  return levels.slice(-4);
}

// ── UTILITY ──────────────────────────────────────────

export function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    const prev = arr[i - 1];
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
  });
  return trs.reduce((sum, tr) => sum + tr, 0) / period;
}

// ── MASTER LIQUIDITY FUNCTION ────────────────────────

export function detectSLPLiquidity(
  candles:    Candle[],
  swingHighs: SwingPoint[],
  swingLows:  SwingPoint[],
  bias:       string,
  atr:        number
): LiquidityLevel[] {
  const eqHL   = detectEqualHighsLows(candles, swingHighs, swingLows, atr);
  const indu   = detectInducement(swingHighs, swingLows, candles, atr, bias);

  return [...eqHL, ...indu]
    .filter(l => !l.swept)       // only show unswept levels
    .slice(-8);                  // max 8 levels total
}
