import { Candle } from "../market/marketDataService";

// ── TYPES ──────────────────────────────────────────────────

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: "HIGH" | "LOW";
}

export interface BOSEvent {
  swingTime: number; // timestamp of the swing high/low that got broken
  breakTime: number; // timestamp of the candle that broke the swing
  price: number; // the price level of the broken swing
  direction: "BULLISH" | "BEARISH";
  type: "BOS" | "CHOCH" | "MSS";
}

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number; // upper boundary of OB zone
  bottom: number; // lower boundary of OB zone
  startTime: number; // candle time of the OB candle
  endTime: number; // time of the last candle
  status: "ACTIVE" | "MITIGATED" | "BREAKER";
  isBroken: boolean; // true = became a breaker block
}

export interface LiquidityLevel {
  price: number;
  type: "BUY_SIDE" | "SELL_SIDE"; // BSL = equal highs, SSL = equal lows
  swept: boolean; // true = price swept through it
  time: number;
  strength: number; // number of touches
}

export interface Inducement {
  price: number;
  type: "BULLISH" | "BEARISH"; // direction of real move after inducement
  time: number;
}

export interface FVG {
  top: number;
  bottom: number;
  type: "BULLISH" | "BEARISH";
  time: number;
  filled: boolean; // true = price traded back through the gap
}

export interface SMCResult {
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  bosEvents: BOSEvent[];
  orderBlocks: OrderBlock[];
  liquidityLevels: LiquidityLevel[];
  inducements: Inducement[];
  fvgs: FVG[];
}

// ── UTILITY ────────────────────────────────────────────────

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    const prev = arr[i - 1];
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    );
  });
  return trs.slice(1).reduce((a, b) => a + b, 0) / period;
}

// ── STEP 1: DETECT SWING HIGHS AND LOWS ───────────────────

export function detectSwings(
  candles: Candle[],
  lookback = 3,
): {
  highs: SwingPoint[];
  lows: SwingPoint[];
} {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    const left = candles.slice(i - lookback, i);
    const right = candles.slice(i + 1, i + lookback + 1);

    if (
      left.every((x) => x.high <= c.high) &&
      right.every((x) => x.high <= c.high)
    ) {
      highs.push({ index: i, time: c.time, price: c.high, type: "HIGH" });
    }
    if (
      left.every((x) => x.low >= c.low) &&
      right.every((x) => x.low >= c.low)
    ) {
      lows.push({ index: i, time: c.time, price: c.low, type: "LOW" });
    }
  }
  return { highs, lows };
}

// ── STEP 2: DETECT BOS, CHoCH, MSS ────────────────────────

export function detectBOS(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
): BOSEvent[] {
  const events: BOSEvent[] = [];
  if (swingHighs.length < 2 || swingLows.length < 2) return events;

  let prevTrend: "BULLISH" | "BEARISH" | null = null;
  let chochCounted = 0;

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i];

    const lastHigh = swingHighs.filter((h) => h.index < i).slice(-1)[0];
    const lastLow = swingLows.filter((l) => l.index < i).slice(-1)[0];

    if (!lastHigh || !lastLow) continue;

    if (c.close > lastHigh.price) {
      const isCHoCH = prevTrend === "BEARISH";
      const isMSS = isCHoCH && chochCounted === 1;

      events.push({
        swingTime: lastHigh.time,
        breakTime: c.time,
        price: lastHigh.price,
        direction: "BULLISH",
        type: isMSS ? "MSS" : isCHoCH ? "CHOCH" : "BOS",
      });

      if (isCHoCH) chochCounted++;
      else chochCounted = 0;
      prevTrend = "BULLISH";
    }

    if (c.close < lastLow.price) {
      const isCHoCH = prevTrend === "BULLISH";
      const isMSS = isCHoCH && chochCounted === 1;

      events.push({
        swingTime: lastLow.time,
        breakTime: c.time,
        price: lastLow.price,
        direction: "BEARISH",
        type: isMSS ? "MSS" : isCHoCH ? "CHOCH" : "BOS",
      });

      if (isCHoCH) chochCounted++;
      else chochCounted = 0;
      prevTrend = "BEARISH";
    }
  }

  const seen = new Set<number>();
  return events
    .filter((e) => {
      const key = Math.round(e.price);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ── STEP 3: DETECT ORDER BLOCKS ───────────────────────────

export function detectOrderBlocks(
  candles: Candle[],
  bosEvents: BOSEvent[],
): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  bosEvents.forEach((bos, bosIdx) => {
    const breakCandle = candles.find((c) => c.time === bos.breakTime);
    if (!breakCandle) return;

    const breakIndex = candles.indexOf(breakCandle);
    if (breakIndex < 1) return;

    if (bos.direction === "BULLISH") {
      let obCandle: Candle | null = null;
      for (let i = breakIndex - 1; i >= Math.max(0, breakIndex - 10); i--) {
        if (candles[i].close < candles[i].open) {
          obCandle = candles[i];
          break;
        }
      }
      if (!obCandle) return;

      const top = obCandle.high;
      const bottom = Math.min(obCandle.open, obCandle.close);

      let status: OrderBlock["status"] = "ACTIVE";
      if (currentPrice < bottom) status = "BREAKER";
      else if (currentPrice <= top) status = "MITIGATED";

      blocks.push({
        id: `bull-ob-${bosIdx}`,
        type: "BULLISH",
        top,
        bottom,
        startTime: obCandle.time,
        endTime: candles[candles.length - 1].time,
        status,
        isBroken: status === "BREAKER",
      });
    } else {
      let obCandle: Candle | null = null;
      for (let i = breakIndex - 1; i >= Math.max(0, breakIndex - 10); i--) {
        if (candles[i].close > candles[i].open) {
          obCandle = candles[i];
          break;
        }
      }
      if (!obCandle) return;

      const top = Math.max(obCandle.open, obCandle.close);
      const bottom = obCandle.low;

      let status: OrderBlock["status"] = "ACTIVE";
      if (currentPrice > top) status = "BREAKER";
      else if (currentPrice >= bottom) status = "MITIGATED";

      blocks.push({
        id: `bear-ob-${bosIdx}`,
        type: "BEARISH",
        top,
        bottom,
        startTime: obCandle.time,
        endTime: candles[candles.length - 1].time,
        status,
        isBroken: status === "BREAKER",
      });
    }
  });

  return blocks;
}

// ── STEP 4: DETECT LIQUIDITY LEVELS (Equal Highs / Equal Lows) ──

export function detectLiquidity(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  atr: number,
): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const tolerance = atr * 0.15;
  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  const visitedHighs = new Set<number>();
  swingHighs.forEach((h, i) => {
    if (visitedHighs.has(i)) return;
    const group = swingHighs.filter((h2, j) => {
      if (i === j) return false;
      return Math.abs(h2.price - h.price) <= tolerance;
    });
    if (group.length >= 1) {
      visitedHighs.add(i);
      group.forEach((_, j) => visitedHighs.add(swingHighs.indexOf(group[j])));

      const avgPrice =
        (h.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const swept = currentPrice > avgPrice;

      levels.push({
        price: avgPrice,
        type: "BUY_SIDE",
        swept,
        time: h.time,
        strength: group.length + 1,
      });
    }
  });

  const visitedLows = new Set<number>();
  swingLows.forEach((l, i) => {
    if (visitedLows.has(i)) return;
    const group = swingLows.filter((l2, j) => {
      if (i === j) return false;
      return Math.abs(l2.price - l.price) <= tolerance;
    });
    if (group.length >= 1) {
      visitedLows.add(i);
      group.forEach((_, j) => visitedLows.add(swingLows.indexOf(group[j])));

      const avgPrice =
        (l.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const swept = currentPrice < avgPrice;

      levels.push({
        price: avgPrice,
        type: "SELL_SIDE",
        swept,
        time: l.time,
        strength: group.length + 1,
      });
    }
  });

  return levels.slice(-10);
}

// ── STEP 5: DETECT INDUCEMENT ──────────────────────────────

export function detectInducement(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  atr: number,
): Inducement[] {
  const indu: Inducement[] = [];

  for (let i = 1; i < swingLows.length - 1; i++) {
    const prev = swingLows[i - 1];
    const curr = swingLows[i];
    const next = swingLows[i + 1];
    const isMinor = curr.price > prev.price && curr.price > next.price;
    const rangeOK = curr.price - Math.min(prev.price, next.price) < atr * 0.5;
    if (isMinor && rangeOK) {
      indu.push({ price: curr.price, type: "BULLISH", time: curr.time });
    }
  }

  for (let i = 1; i < swingHighs.length - 1; i++) {
    const prev = swingHighs[i - 1];
    const curr = swingHighs[i];
    const next = swingHighs[i + 1];
    const isMinor = curr.price < prev.price && curr.price < next.price;
    const rangeOK = Math.max(prev.price, next.price) - curr.price < atr * 0.5;
    if (isMinor && rangeOK) {
      indu.push({ price: curr.price, type: "BEARISH", time: curr.time });
    }
  }

  return indu.slice(-8);
}

// ── STEP 6: DETECT FAIR VALUE GAPS (FVG) ───────────────────

export function detectFVG(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  const currentPrice = candles[candles.length - 1]?.close ?? 0;

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    if (next.low > prev.high) {
      const top = next.low;
      const bottom = prev.high;
      const filled = currentPrice < bottom;
      fvgs.push({ top, bottom, type: "BULLISH", time: curr.time, filled });
    }

    if (next.high < prev.low) {
      const top = prev.low;
      const bottom = next.high;
      const filled = currentPrice > top;
      fvgs.push({ top, bottom, type: "BEARISH", time: curr.time, filled });
    }
  }

  return fvgs;
}

// ── MASTER FUNCTION: Run all detection ─────────────────────
export function runSMCAnalysis(candles: Candle[]): SMCResult {
  if (candles.length < 30) {
    return {
      swingHighs: [],
      swingLows: [],
      bosEvents: [],
      orderBlocks: [],
      liquidityLevels: [],
      inducements: [],
      fvgs: [],
    };
  }

  const lookback = candles.length >= 100 ? 5 : 3;
  const atr = calcATR(candles, 14);
  const { highs: swingHighs, lows: swingLows } = detectSwings(
    candles,
    lookback,
  );
  const bosEvents = detectBOS(candles, swingHighs, swingLows);
  const orderBlocks = detectOrderBlocks(candles, bosEvents);
  const liquidityLevels = detectLiquidity(candles, swingHighs, swingLows, atr);
  const inducements = detectInducement(candles, swingHighs, swingLows, atr);
  const fvgs = detectFVG(candles);

  return {
    swingHighs,
    swingLows,
    bosEvents: bosEvents.slice(-4),
    orderBlocks: orderBlocks.filter((b) => b.status === "ACTIVE").slice(-3),
    liquidityLevels: liquidityLevels.filter((l) => !l.swept).slice(-3),
    inducements: inducements.slice(-2),
    fvgs: fvgs.filter((f) => !f.filled).slice(-2),
  };
}
