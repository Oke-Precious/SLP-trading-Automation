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
}

export interface Inducement {
  price: number;
  type: "BULLISH" | "BEARISH";
  time: number;
  // A valid inducement MUST retrace at least 50% of the last move
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
  // Satisfies the 4 rules: Triggered MSS/BOS, protected by inducement (>=50% pullback), unmitigated, closest to inducement
}

export interface LiquidityLevel {
  price: number;
  type: "TRENDLINE" | "EQUAL_HIGHS_LOWS" | "LONG_WICK";
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
  inducements: Inducement[];
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

// ── STEP 2: DETECT BOS / MSS ────────────────────────

export function detectBOS(candles: Candle[], swingHighs: SwingPoint[], swingLows: SwingPoint[]): BOSEvent[] {
  const events: BOSEvent[] = []
  let prevTrend: 'BULLISH' | 'BEARISH' | null = null
  let mssStreak = 0

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i]
    const lastHigh = swingHighs.filter(h => h.index < i).slice(-1)[0]
    const lastLow  = swingLows.filter(l => l.index < i).slice(-1)[0]
    if (!lastHigh || !lastLow) continue

    if (c.close > lastHigh.price) {
      const isMSS = prevTrend === 'BEARISH'
      events.push({
        swingTime: lastHigh.time, breakTime: c.time, price: lastHigh.price,
        direction: 'BULLISH', type: isMSS ? 'MSS' : 'BOS',
      })
      mssStreak = isMSS ? mssStreak + 1 : 0
      prevTrend = 'BULLISH'
    }
    if (c.close < lastLow.price) {
      const isMSS = prevTrend === 'BULLISH'
      events.push({
        swingTime: lastLow.time, breakTime: c.time, price: lastLow.price,
        direction: 'BEARISH', type: isMSS ? 'MSS' : 'BOS',
      })
      mssStreak = isMSS ? mssStreak + 1 : 0
      prevTrend = 'BEARISH'
    }
  }

  const seen = new Set<string>()
  return events.filter(e => {
    const key = e.price.toFixed(6)
    if (seen.has(key)) return false
    seen.add(key); return true
  }).slice(-4)
}

// ── STEP 3: DETECT LIQUIDITY / INDUCEMENT (50% rule) ────────

export function detectInducements(candles: Candle[], bosEvents: BOSEvent[], swingHighs: SwingPoint[], swingLows: SwingPoint[]): Inducement[] {
  const inducements: Inducement[] = [];
  
  bosEvents.forEach(bos => {
    const breakCandle = candles.find((c) => c.time === bos.breakTime);
    if (!breakCandle) return;
    const breakIndex = candles.indexOf(breakCandle);
    const startSwing = bos.direction === "BULLISH" 
      ? swingLows.filter(l => l.index < breakIndex).slice(-1)[0]
      : swingHighs.filter(h => h.index < breakIndex).slice(-1)[0];
      
    if (!startSwing) return;

    // The move is from startSwing to the peak after BOS
    let peakPrice = bos.price;
    let peakIndex = breakIndex;
    
    // Find the extreme of the push
    for (let i = breakIndex; i < Math.min(candles.length, breakIndex + 20); i++) {
      if (bos.direction === "BULLISH" && candles[i].high > peakPrice) {
        peakPrice = candles[i].high;
        peakIndex = i;
      }
      if (bos.direction === "BEARISH" && candles[i].low < peakPrice) {
        peakPrice = candles[i].low;
        peakIndex = i;
      }
    }

    const moveSize = Math.abs(peakPrice - startSwing.price);
    const threshold50 = bos.direction === "BULLISH" 
      ? peakPrice - (moveSize * 0.5) 
      : peakPrice + (moveSize * 0.5);

    // Look for a pullback that reaches 50%
    for (let i = peakIndex + 1; i < candles.length; i++) {
      if (bos.direction === "BULLISH" && candles[i].low <= threshold50) {
        inducements.push({
          price: threshold50,
          type: "BULLISH",
          time: candles[i].time
        });
        break; // found the inducement pullback
      }
      if (bos.direction === "BEARISH" && candles[i].high >= threshold50) {
        inducements.push({
          price: threshold50,
          type: "BEARISH",
          time: candles[i].time
        });
        break;
      }
    }
  });

  return inducements.slice(-5); // keep recent
}

// ── STEP 4: DETECT ORDER BLOCKS (Strict 4 Rules) ─────────

export function detectOrderBlocks(
  candles: Candle[],
  bosEvents: BOSEvent[],
  inducements: Inducement[]
): OrderBlock[] {
  const blocks: OrderBlock[] = [];

  bosEvents.forEach((bos, bosIdx) => {
    const breakCandle = candles.find((c) => c.time === bos.breakTime);
    if (!breakCandle) return;

    const breakIndex = candles.indexOf(breakCandle);
    if (breakIndex < 1) return;

    // Find the inducement for this leg (nearest one conceptually)
    const validInducement = inducements.find(ind => ind.time >= bos.swingTime && ind.type === bos.direction);
    // Rule 2: Must have liquidity/inducement protecting it. If not, this is not a valid SLP Order Block.
    if (!validInducement) return;

    if (bos.direction === "BULLISH") {
      let obCandle: Candle | null = null;
      // Rule 4: POI closest to the liquidity/inducement.
      // We look backwards from the inducement price entry point to find the unmitigated down candle
      for (let i = breakIndex - 1; i >= Math.max(0, breakIndex - 20); i--) {
        if (candles[i].close < candles[i].open && candles[i].high <= validInducement.price) {
          obCandle = candles[i];
          break; // nearest one
        }
      }
      if (!obCandle) return;

      const top = obCandle.high;
      const bottom = Math.min(obCandle.open, obCandle.close);

      let mitigationTime: number | null = null;
      let breakerTime: number | null = null;
      let status: OrderBlock["status"] = "ACTIVE";

      for (let j = breakIndex; j < candles.length; j++) {
        const c = candles[j];
        if (c.low <= top && mitigationTime === null) {
          mitigationTime = c.time;
          status = "MITIGATED"; // Rule 3 evaluation
        }
        if (c.close < bottom) {
          breakerTime = c.time;
          status = "BREAKER";
          break;
        }
      }

      const endTime = breakerTime ?? mitigationTime ?? candles[candles.length - 1].time;

      blocks.push({
        id: `bull-ob-${bosIdx}`,
        type: "BULLISH",
        top,
        bottom,
        startTime: obCandle.time,
        endTime,
        status,
        isBroken: status === "BREAKER",
      });
    } else {
      let obCandle: Candle | null = null;
      for (let i = breakIndex - 1; i >= Math.max(0, breakIndex - 20); i--) {
        if (candles[i].close > candles[i].open && candles[i].low >= validInducement.price) {
          obCandle = candles[i];
          break;
        }
      }
      if (!obCandle) return;

      const top = Math.max(obCandle.open, obCandle.close);
      const bottom = obCandle.low;

      let mitigationTime: number | null = null;
      let breakerTime: number | null = null;
      let status: OrderBlock["status"] = "ACTIVE";

      for (let j = breakIndex; j < candles.length; j++) {
        const c = candles[j];
        if (c.high >= bottom && mitigationTime === null) {
          mitigationTime = c.time;
          status = "MITIGATED";
        }
        if (c.close > top) {
          breakerTime = c.time;
          status = "BREAKER";
          break;
        }
      }

      const endTime = breakerTime ?? mitigationTime ?? candles[candles.length - 1].time;

      blocks.push({
        id: `bear-ob-${bosIdx}`,
        type: "BEARISH",
        top,
        bottom,
        startTime: obCandle.time,
        endTime,
        status,
        isBroken: status === "BREAKER",
      });
    }
  });

  return blocks;
}

// ── STEP 5: DETECT OTHER LIQUIDITY LEVELS ────────

export function detectOtherLiquidity(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  atr: number,
): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const tolerance = atr * 0.15;

  // 1. Equal Highs / Lows
  const visitedHighs = new Set<number>();
  swingHighs.forEach((h, i) => {
    if (visitedHighs.has(i)) return;
    const group = swingHighs.filter((h2, j) => i !== j && Math.abs(h2.price - h.price) <= tolerance);
    if (group.length >= 1) {
      visitedHighs.add(i);
      group.forEach((_, j) => visitedHighs.add(swingHighs.indexOf(group[j])));

      const avgPrice = (h.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const latestPointTime = Math.max(h.time, ...group.map(x => x.time));
      let swept = false;
      let sweepTime: number | undefined;

      for (let j = 0; j < candles.length; j++) {
        if (candles[j].time > latestPointTime && candles[j].high > avgPrice) {
          swept = true; sweepTime = candles[j].time; break;
        }
      }
      levels.push({ price: avgPrice, type: "EQUAL_HIGHS_LOWS", swept, time: h.time, strength: group.length + 1, sweepTime });
    }
  });

  const visitedLows = new Set<number>();
  swingLows.forEach((l, i) => {
    if (visitedLows.has(i)) return;
    const group = swingLows.filter((l2, j) => i !== j && Math.abs(l2.price - l.price) <= tolerance);
    if (group.length >= 1) {
      visitedLows.add(i);
      group.forEach((_, j) => visitedLows.add(swingLows.indexOf(group[j])));

      const avgPrice = (l.price + group.reduce((s, x) => s + x.price, 0)) / (group.length + 1);
      const latestPointTime = Math.max(l.time, ...group.map(x => x.time));
      let swept = false;
      let sweepTime: number | undefined;

      for (let j = 0; j < candles.length; j++) {
        if (candles[j].time > latestPointTime && candles[j].low < avgPrice) {
          swept = true; sweepTime = candles[j].time; break;
        }
      }
      levels.push({ price: avgPrice, type: "EQUAL_HIGHS_LOWS", swept, time: l.time, strength: group.length + 1, sweepTime });
    }
  });

  // 2. Long Wick Liquidity
  candles.slice(-50).forEach(c => {
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

  // 3. Trendline Liquidity (Simplified proxy)
  if (swingLows.length >= 3) {
      const recentLows = swingLows.slice(-3);
      if (recentLows[0].price < recentLows[1].price && recentLows[1].price < recentLows[2].price) {
          levels.push({ price: recentLows[0].price, type: "TRENDLINE", swept: false, time: recentLows[0].time });
      }
  }
  if (swingHighs.length >= 3) {
      const recentHighs = swingHighs.slice(-3);
      if (recentHighs[0].price > recentHighs[1].price && recentHighs[1].price > recentHighs[2].price) {
          levels.push({ price: recentHighs[0].price, type: "TRENDLINE", swept: false, time: recentHighs[0].time });
      }
  }

  return levels.slice(-10);
}

// ── MASTER FUNCTION: Run all detection ─────────────────────
export function runSLPAnalysis(candles: Candle[]): SLPResult {
  if (candles.length < 30) {
    return {
      swingHighs: [],
      swingLows: [],
      bosEvents: [],
      orderBlocks: [],
      liquidityLevels: [],
      inducements: [],
    };
  }

  const lookback = candles.length >= 100 ? 5 : 3;
  const atr = calcATR(candles, 14);
  const { highs: swingHighs, lows: swingLows } = detectSwings(candles, lookback);
  
  const bosEvents = detectBOS(candles, swingHighs, swingLows);
  const inducements = detectInducements(candles, bosEvents, swingHighs, swingLows);
  const orderBlocks = detectOrderBlocks(candles, bosEvents, inducements);
  const liquidityLevels = detectOtherLiquidity(candles, swingHighs, swingLows, atr);

  return {
    swingHighs,
    swingLows,
    bosEvents,
    orderBlocks: orderBlocks.filter((b) => b.status === "ACTIVE" || b.status === "BREAKER").slice(-4),
    liquidityLevels: liquidityLevels.filter((l) => !l.swept).slice(-10),
    inducements,
  };
}

