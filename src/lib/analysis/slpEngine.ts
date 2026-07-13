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
  type: "BOS" | "MSS";
  impulseStartPrice: number; // start of the impulsive move
  impulseStartTime: number;
}

export interface POIChecklist {
  triggeredStructure: boolean;     // Rule 1: Origin of MSS or BOS
  isProtectedByLiquidity: boolean;  // Rule 2: Liquidity pool below bullish POI / above bearish POI
  isUnmitigated: boolean;          // Rule 3: Price has not returned and closed past it yet
  isClosestToLiquidity: boolean;   // Rule 4: Closest unmitigated POI to the liquidity taken
}

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  startTime: number;
  endTime: number;
  status: "ACTIVE" | "MITIGATED" | "BREAKER";
  isBroken: boolean;
  checklist: POIChecklist;
}

export interface LiquidityLevel {
  price: number;
  type: "TRENDLINE" | "EQUAL_HIGHS_LOWS" | "LONG_WICK" | "INDUCEMENT";
  swept: boolean;
  time: number;
  sweepTime?: number;
  strength?: number; // Optional, useful for equal highs/lows
}

export interface SLPResult {
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  bosEvents: BOSEvent[];
  orderBlocks: OrderBlock[];
  liquidityLevels: LiquidityLevel[];
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
      Math.abs(c.low - prev.close)
    );
  });
  return trs.slice(1).reduce((a, b) => a + b, 0) / period;
}

// ── STEP 1: DETECT SWING HIGHS AND LOWS ───────────────────

export function detectSwings(
  candles: Candle[],
  lookback = 3
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

// ── STEP 2 & 3: DETECT BIAS, MSS & BOS SEQUENTIALLY ───────

export function detectBOSAndMSS(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[]
): BOSEvent[] {
  const events: BOSEvent[] = [];
  let bias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let hasMSS = false;
  let mssTime = -1;
  let lastBrokenHighTime = -1;
  let lastBrokenLowTime = -1;

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i];

    // Establish bias using available swing points before candle i
    const availableHighs = swingHighs.filter((h) => h.index < i);
    const availableLows = swingLows.filter((l) => l.index < i);

    if (availableHighs.length >= 2 && availableLows.length >= 2) {
      const h1 = availableHighs[availableHighs.length - 2];
      const h2 = availableHighs[availableHighs.length - 1];
      const l1 = availableLows[availableLows.length - 2];
      const l2 = availableLows[availableLows.length - 1];

      // BULLISH bias = price making Higher Highs and Higher Lows (HH + HL)
      if (h2.price > h1.price && l2.price > l1.price) {
        if (bias !== "BULLISH") {
          bias = "BULLISH";
          hasMSS = false; // Reset MSS when bias changes
        }
      }
      // BEARISH bias = price making Lower Highs and Lower Lows (LH + LL)
      else if (h2.price < h1.price && l2.price < l1.price) {
        if (bias !== "BEARISH") {
          bias = "BEARISH";
          hasMSS = false; // Reset MSS when bias changes
        }
      } else {
        bias = "NEUTRAL";
        hasMSS = false;
      }
    } else {
      bias = "NEUTRAL";
      hasMSS = false;
    }

    if (bias === "NEUTRAL") continue;

    // STEP 2 — MARKET STRUCTURE SHIFT (MSS)
    if (bias === "BULLISH" && !hasMSS) {
      const lastHigh = availableHighs[availableHighs.length - 1];
      if (lastHigh && c.close > lastHigh.price && lastHigh.time !== lastBrokenHighTime) {
        hasMSS = true;
        mssTime = c.time;

        let impulseStartPrice = lastHigh.price;
        let impulseStartTime = lastHigh.time;
        for (let j = lastHigh.index; j < i; j++) {
          if (candles[j].low < impulseStartPrice) {
            impulseStartPrice = candles[j].low;
            impulseStartTime = candles[j].time;
          }
        }

        events.push({
          swingTime: lastHigh.time,
          breakTime: c.time,
          price: lastHigh.price,
          direction: "BULLISH",
          type: "MSS",
          impulseStartPrice,
          impulseStartTime,
        });
        lastBrokenHighTime = lastHigh.time;
      }
    } else if (bias === "BEARISH" && !hasMSS) {
      const lastLow = availableLows[availableLows.length - 1];
      if (lastLow && c.close < lastLow.price && lastLow.time !== lastBrokenLowTime) {
        hasMSS = true;
        mssTime = c.time;

        let impulseStartPrice = lastLow.price;
        let impulseStartTime = lastLow.time;
        for (let j = lastLow.index; j < i; j++) {
          if (candles[j].high > impulseStartPrice) {
            impulseStartPrice = candles[j].high;
            impulseStartTime = candles[j].time;
          }
        }

        events.push({
          swingTime: lastLow.time,
          breakTime: c.time,
          price: lastLow.price,
          direction: "BEARISH",
          type: "MSS",
          impulseStartPrice,
          impulseStartTime,
        });
        lastBrokenLowTime = lastLow.time;
      }
    }

    // STEP 3 — BREAK OF STRUCTURE (BOS)
    // BOS MUST follow MSS.
    if (bias === "BULLISH" && hasMSS && c.time > mssTime) {
      const lastHigh = availableHighs[availableHighs.length - 1];
      if (lastHigh && c.close > lastHigh.price && lastHigh.time !== lastBrokenHighTime) {
        let impulseStartPrice = lastHigh.price;
        let impulseStartTime = lastHigh.time;
        for (let j = lastHigh.index; j < i; j++) {
          if (candles[j].low < impulseStartPrice) {
            impulseStartPrice = candles[j].low;
            impulseStartTime = candles[j].time;
          }
        }

        events.push({
          swingTime: lastHigh.time,
          breakTime: c.time,
          price: lastHigh.price,
          direction: "BULLISH",
          type: "BOS",
          impulseStartPrice,
          impulseStartTime,
        });
        lastBrokenHighTime = lastHigh.time;
      }
    } else if (bias === "BEARISH" && hasMSS && c.time > mssTime) {
      const lastLow = availableLows[availableLows.length - 1];
      if (lastLow && c.close < lastLow.price && lastLow.time !== lastBrokenLowTime) {
        let impulseStartPrice = lastLow.price;
        let impulseStartTime = lastLow.time;
        for (let j = lastLow.index; j < i; j++) {
          if (candles[j].high > impulseStartPrice) {
            impulseStartPrice = candles[j].high;
            impulseStartTime = candles[j].time;
          }
        }

        events.push({
          swingTime: lastLow.time,
          breakTime: c.time,
          price: lastLow.price,
          direction: "BEARISH",
          type: "BOS",
          impulseStartPrice,
          impulseStartTime,
        });
        lastBrokenLowTime = lastLow.time;
      }
    }
  }

  // Deduplicate events to avoid double markings
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.price.toFixed(6)}-${e.direction}-${e.type}-${e.breakTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── STEP 5 & 6: POI SELECTION & VALID POI TYPES ───────────

export function detectOrderBlocks(
  candles: Candle[],
  bosEvents: BOSEvent[],
  liquidityLevels: LiquidityLevel[]
): OrderBlock[] {
  const blocks: OrderBlock[] = [];

  bosEvents.forEach((bos, bosIdx) => {
    const breakCandle = candles.find((c) => c.time === bos.breakTime);
    if (!breakCandle) return;

    const breakIndex = candles.indexOf(breakCandle);
    if (breakIndex < 1) return;

    const impulseStartIndex = candles.findIndex((c) => c.time === bos.impulseStartTime);
    if (impulseStartIndex === -1 || impulseStartIndex >= breakIndex) return;

    let bestCandleIndex = -1;
    if (bos.direction === "BULLISH") {
      let lowestLow = Infinity;
      for (let i = impulseStartIndex; i < breakIndex; i++) {
        if (candles[i].close < candles[i].open && candles[i].low < lowestLow) {
          lowestLow = candles[i].low;
          bestCandleIndex = i;
        }
      }
      if (bestCandleIndex === -1) {
        bestCandleIndex = impulseStartIndex;
      }
    } else {
      let highestHigh = -Infinity;
      for (let i = impulseStartIndex; i < breakIndex; i++) {
        if (candles[i].close > candles[i].open && candles[i].high > highestHigh) {
          highestHigh = candles[i].high;
          bestCandleIndex = i;
        }
      }
      if (bestCandleIndex === -1) {
        bestCandleIndex = impulseStartIndex;
      }
    }

    const targetCandle = candles[bestCandleIndex];
    // Rule: OB zone = from the candle's open to its close (body only — not the wicks)
    const top = Math.max(targetCandle.open, targetCandle.close);
    const bottom = Math.min(targetCandle.open, targetCandle.close);

    let status: OrderBlock["status"] = "ACTIVE";
    let isBroken = false;
    let endTime = candles[candles.length - 1].time;

    // The 50% Retracement Rule: Must reach at least 50% of the POI zone
    const mid = (top + bottom) / 2;

    for (let j = breakIndex; j < candles.length; j++) {
      if (bos.direction === "BULLISH") {
        if (candles[j].low <= mid && status === "ACTIVE") {
          status = "MITIGATED";
        }
        if (candles[j].close < bottom) {
          status = "BREAKER";
          isBroken = true;
          endTime = candles[j].time;
          break;
        }
      } else {
        if (candles[j].high >= mid && status === "ACTIVE") {
          status = "MITIGATED";
        }
        if (candles[j].close > top) {
          status = "BREAKER";
          isBroken = true;
          endTime = candles[j].time;
          break;
        }
      }
    }

    const isUnmitigated = status === "ACTIVE";

    // Rule 2 — Protected by liquidity (below bullish POI or above bearish POI)
    const isProtectedByLiquidity = liquidityLevels.some((l) => {
      if (bos.direction === "BULLISH") {
        return l.price < top;
      } else {
        return l.price > bottom;
      }
    });

    blocks.push({
      id: `${bos.direction.toLowerCase()}-ob-${bosIdx}`,
      type: bos.direction,
      top,
      bottom,
      startTime: targetCandle.time,
      endTime,
      status,
      isBroken,
      checklist: {
        triggeredStructure: true, // Rule 1: Always true as it is detected from MSS/BOS leg
        isProtectedByLiquidity,   // Rule 2
        isUnmitigated,            // Rule 3
        isClosestToLiquidity: false, // Rule 4: will be set in master function pass
      },
    });
  });

  return blocks;
}

// ── STEP 4: DETECT LIQUIDITY LEVELS ───────────────────────

export function detectOtherLiquidity(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  atr: number
): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const tolerance = atr * 0.15;

  // 1. Equal Highs / Equal Lows (Type 2)
  const visitedHighs = new Set<number>();
  swingHighs.forEach((h, i) => {
    if (visitedHighs.has(i)) return;
    const group = swingHighs.filter(
      (h2, j) => i !== j && Math.abs(h2.price - h.price) <= tolerance
    );
    if (group.length >= 1) {
      visitedHighs.add(i);
      group.forEach((_, j) => visitedHighs.add(swingHighs.indexOf(group[j])));

      const avgPrice =
        (h.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const latestPointTime = Math.max(h.time, ...group.map((x) => x.time));
      let swept = false;
      let sweepTime: number | undefined;

      for (let j = 0; j < candles.length; j++) {
        if (candles[j].time > latestPointTime && candles[j].high > avgPrice) {
          swept = true;
          sweepTime = candles[j].time;
          break;
        }
      }
      levels.push({
        price: avgPrice,
        type: "EQUAL_HIGHS_LOWS",
        swept,
        time: h.time,
        strength: group.length + 1,
        sweepTime,
      });
    }
  });

  const visitedLows = new Set<number>();
  swingLows.forEach((l, i) => {
    if (visitedLows.has(i)) return;
    const group = swingLows.filter(
      (l2, j) => i !== j && Math.abs(l2.price - l.price) <= tolerance
    );
    if (group.length >= 1) {
      visitedLows.add(i);
      group.forEach((_, j) => visitedLows.add(swingLows.indexOf(group[j])));

      const avgPrice =
        (l.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const latestPointTime = Math.max(l.time, ...group.map((x) => x.time));
      let swept = false;
      let sweepTime: number | undefined;

      for (let j = 0; j < candles.length; j++) {
        if (candles[j].time > latestPointTime && candles[j].low < avgPrice) {
          swept = true;
          sweepTime = candles[j].time;
          break;
        }
      }
      levels.push({
        price: avgPrice,
        type: "EQUAL_HIGHS_LOWS",
        swept,
        time: l.time,
        strength: group.length + 1,
        sweepTime,
      });
    }
  });

  // 2. Long Wick Liquidity (Type 3)
  candles.slice(-50).forEach((c) => {
    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    if (upperWick > body * 2.5) {
      levels.push({ price: c.high, type: "LONG_WICK", swept: false, time: c.time });
    }
    if (lowerWick > body * 2.5) {
      levels.push({ price: c.low, type: "LONG_WICK", swept: false, time: c.time });
    }
  });

  // 3. Trendline Liquidity (Type 1)
  if (swingLows.length >= 3) {
    const recentLows = swingLows.slice(-3);
    if (
      recentLows[0].price < recentLows[1].price &&
      recentLows[1].price < recentLows[2].price
    ) {
      levels.push({
        price: recentLows[0].price,
        type: "TRENDLINE",
        swept: false,
        time: recentLows[0].time,
      });
    }
  }
  if (swingHighs.length >= 3) {
    const recentHighs = swingHighs.slice(-3);
    if (
      recentHighs[0].price > recentHighs[1].price &&
      recentHighs[1].price > recentHighs[2].price
    ) {
      levels.push({
        price: recentHighs[0].price,
        type: "TRENDLINE",
        swept: false,
        time: recentHighs[0].time,
      });
    }
  }

  return levels;
}

// 4. Inducement Liquidity (Type 4)
export function detectInducements(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[]
): LiquidityLevel[] {
  const inducements: LiquidityLevel[] = [];

  // For lows (Bullish inducement): minor HL between two major HLs
  for (let i = 1; i < swingLows.length - 1; i++) {
    const prevL = swingLows[i - 1];
    const currL = swingLows[i];
    const nextL = swingLows[i + 1];

    if (currL.price > prevL.price && currL.price > nextL.price) {
      let swept = false;
      let sweepTime: number | undefined;
      for (let j = currL.index + 1; j < candles.length; j++) {
        if (candles[j].low < currL.price) {
          swept = true;
          sweepTime = candles[j].time;
          break;
        }
      }
      inducements.push({
        price: currL.price,
        type: "INDUCEMENT",
        swept,
        time: currL.time,
        sweepTime,
      });
    }
  }

  // For highs (Bearish inducement): minor LH between two major LHs
  for (let i = 1; i < swingHighs.length - 1; i++) {
    const prevH = swingHighs[i - 1];
    const currH = swingHighs[i];
    const nextH = swingHighs[i + 1];

    if (currH.price < prevH.price && currH.price < nextH.price) {
      let swept = false;
      let sweepTime: number | undefined;
      for (let j = currH.index + 1; j < candles.length; j++) {
        if (candles[j].high > currH.price) {
          swept = true;
          sweepTime = candles[j].time;
          break;
        }
      }
      inducements.push({
        price: currH.price,
        type: "INDUCEMENT",
        swept,
        time: currH.time,
        sweepTime,
      });
    }
  }

  return inducements;
}

// ── MASTER FUNCTION: RUN ALL DETECTIONS ───────────────────

export function runSLPAnalysis(candles: Candle[]): SLPResult {
  if (candles.length < 30) {
    return {
      swingHighs: [],
      swingLows: [],
      bosEvents: [],
      orderBlocks: [],
      liquidityLevels: [],
    };
  }

  const lookback = candles.length >= 100 ? 5 : 3;
  const atr = calcATR(candles, 14);
  const { highs: swingHighs, lows: swingLows } = detectSwings(candles, lookback);

  const bosEvents = detectBOSAndMSS(candles, swingHighs, swingLows);
  
  const baseLiquidity = detectOtherLiquidity(candles, swingHighs, swingLows, atr);
  const inducements = detectInducements(candles, swingHighs, swingLows);
  const liquidityLevels = [...baseLiquidity, ...inducements].slice(-15);

  const orderBlocks = detectOrderBlocks(candles, bosEvents, liquidityLevels);

  // Rule 4 — Closest unmitigated POI to the liquidity taken
  const sweptLiquidity = liquidityLevels
    .filter((l) => l.swept)
    .sort((a, b) => (b.sweepTime || 0) - (a.sweepTime || 0));
  const lastSweep = sweptLiquidity[0];

  const activeBlocks = orderBlocks.filter((b) => b.status === "ACTIVE");
  let closestBlockId: string | null = null;

  if (lastSweep && activeBlocks.length > 0) {
    let minDistance = Infinity;
    activeBlocks.forEach((b) => {
      const mid = (b.top + b.bottom) / 2;
      const dist = Math.abs(mid - lastSweep.price);
      if (dist < minDistance) {
        minDistance = dist;
        closestBlockId = b.id;
      }
    });
  } else if (activeBlocks.length > 0) {
    // If no swept liquidity yet, default to the closest to current price
    const currentPrice = candles[candles.length - 1].close;
    let minDistance = Infinity;
    activeBlocks.forEach((b) => {
      const mid = (b.top + b.bottom) / 2;
      const dist = Math.abs(mid - currentPrice);
      if (dist < minDistance) {
        minDistance = dist;
        closestBlockId = b.id;
      }
    });
  }

  orderBlocks.forEach((b) => {
    b.checklist.isClosestToLiquidity = b.id === closestBlockId;
  });

  // Only unmitigated OBs and active Breaker Blocks are shown as valid active POIs
  const validBlocks = orderBlocks.filter(
    (b) => b.checklist.isUnmitigated || b.status === "BREAKER"
  );

  return {
    swingHighs,
    swingLows,
    bosEvents,
    orderBlocks: validBlocks.slice(-4),
    liquidityLevels: liquidityLevels.filter((l) => !l.swept).slice(-10),
  };
}
