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

export interface Inducement {
  price: number;
  type: "BULLISH" | "BEARISH";
  time: number;
  retracementPercentage: number;
}

export interface POIChecklist {
  triggeredStructure: boolean;
  protectedByInducement: boolean;
  isUnmitigated: boolean;
  isClosestToInducement: boolean;
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
  let lastBrokenHighTime = -1;
  let lastBrokenLowTime = -1;

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i]
    const lastHigh = swingHighs.filter(h => h.index < i).slice(-1)[0]
    const lastLow  = swingLows.filter(l => l.index < i).slice(-1)[0]
    if (!lastHigh || !lastLow) continue

    if (c.close > lastHigh.price && lastHigh.time !== lastBrokenHighTime) {
      const isMSS = prevTrend === 'BEARISH'
      
      // The impulse start is the lowest point between the swing high and this break
      let impulseStartPrice = lastHigh.price;
      let impulseStartTime = lastHigh.time;
      for (let j = lastHigh.index; j < i; j++) {
        if (candles[j].low < impulseStartPrice) {
          impulseStartPrice = candles[j].low;
          impulseStartTime = candles[j].time;
        }
      }

      events.push({
        swingTime: lastHigh.time, breakTime: c.time, price: lastHigh.price,
        direction: 'BULLISH', type: isMSS ? 'MSS' : 'BOS',
        impulseStartPrice, impulseStartTime
      })
      lastBrokenHighTime = lastHigh.time
      prevTrend = 'BULLISH'
    }
    
    if (c.close < lastLow.price && lastLow.time !== lastBrokenLowTime) {
      const isMSS = prevTrend === 'BULLISH'
      
      // The impulse start is the highest point between the swing low and this break
      let impulseStartPrice = lastLow.price;
      let impulseStartTime = lastLow.time;
      for (let j = lastLow.index; j < i; j++) {
        if (candles[j].high > impulseStartPrice) {
          impulseStartPrice = candles[j].high;
          impulseStartTime = candles[j].time;
        }
      }

      events.push({
        swingTime: lastLow.time, breakTime: c.time, price: lastLow.price,
        direction: 'BEARISH', type: isMSS ? 'MSS' : 'BOS',
        impulseStartPrice, impulseStartTime
      })
      lastBrokenLowTime = lastLow.time
      prevTrend = 'BEARISH'
    }
  }

  // Deduplicate just in case, and keep only the latest 4 to avoid chart clutter
  const seen = new Set<string>()
  return events.filter(e => {
    const key = e.price.toFixed(6) + e.direction
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

    // The move is from impulseStartPrice to the peak after BOS
    let peakPrice = bos.price;
    let peakIndex = breakIndex;
    
    // Find the extreme of the push
    for (let i = breakIndex; i < Math.min(candles.length, breakIndex + 40); i++) {
      if (bos.direction === "BULLISH" && candles[i].high > peakPrice) {
        peakPrice = candles[i].high;
        peakIndex = i;
      }
      if (bos.direction === "BEARISH" && candles[i].low < peakPrice) {
        peakPrice = candles[i].low;
        peakIndex = i;
      }
    }

    const moveSize = Math.abs(peakPrice - bos.impulseStartPrice);
    if (moveSize === 0) return;

    const threshold50 = bos.direction === "BULLISH" 
      ? peakPrice - (moveSize * 0.5) 
      : peakPrice + (moveSize * 0.5);

    // Look for a pullback that reaches 50%
    let maxRetracement = 0;
    let inducementFound = false;
    let inducementTime = 0;

    for (let i = peakIndex + 1; i < candles.length; i++) {
      if (bos.direction === "BULLISH") {
        const retracement = ((peakPrice - candles[i].low) / moveSize) * 100;
        if (retracement > maxRetracement) maxRetracement = retracement;
        if (candles[i].low <= threshold50 && !inducementFound) {
          inducementFound = true;
          inducementTime = candles[i].time;
          // We can break, or keep going to find maxRetracement. Let's break once it hits 50%.
          break;
        }
      }
      if (bos.direction === "BEARISH") {
        const retracement = ((candles[i].high - peakPrice) / moveSize) * 100;
        if (retracement > maxRetracement) maxRetracement = retracement;
        if (candles[i].high >= threshold50 && !inducementFound) {
          inducementFound = true;
          inducementTime = candles[i].time;
          break;
        }
      }
    }

    if (inducementFound) {
      inducements.push({
        price: threshold50,
        type: bos.direction,
        time: inducementTime,
        retracementPercentage: Math.min(maxRetracement, 100) // clamp at 100% just in case
      });
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

    // Rule 1: Triggered MSS/BOS
    const triggeredStructure = true; // inherently true since we derive from bosEvents

    // Rule 2: Protected by inducement
    const validInducement = inducements.find(ind => ind.time >= bos.swingTime && ind.type === bos.direction);
    const protectedByInducement = !!validInducement;

    // Find all candidate candles in the impulse leg
    const impulseStartIndex = candles.findIndex(c => c.time === bos.impulseStartTime);
    if (impulseStartIndex === -1 || impulseStartIndex >= breakIndex) return;

    const candidates: { candle: Candle; checklist: POIChecklist; top: number; bottom: number }[] = [];

    if (bos.direction === "BULLISH") {
      // Candidates are down candles below the inducement price
      for (let i = breakIndex - 1; i >= impulseStartIndex; i--) {
        if (candles[i].close < candles[i].open) {
          const isBelowInducement = validInducement ? candles[i].high <= validInducement.price : false;
          
          let mitigationTime: number | null = null;
          let breakerTime: number | null = null;
          const top = candles[i].high;
          const bottom = Math.min(candles[i].open, candles[i].close);
          
          for (let j = breakIndex; j < candles.length; j++) {
            if (candles[j].low <= top && mitigationTime === null) {
              mitigationTime = candles[j].time;
            }
            if (candles[j].close < bottom) {
              breakerTime = candles[j].time;
              break;
            }
          }
          
          const isUnmitigated = mitigationTime === null;

          candidates.push({
            candle: candles[i],
            top, bottom,
            checklist: {
              triggeredStructure,
              protectedByInducement: isBelowInducement, // Candidate must be below inducement to be protected
              isUnmitigated,
              isClosestToInducement: false // We will evaluate this next
            }
          });
        }
      }
    } else {
      // Candidates are up candles above the inducement price
      for (let i = breakIndex - 1; i >= impulseStartIndex; i--) {
        if (candles[i].close > candles[i].open) {
          const isAboveInducement = validInducement ? candles[i].low >= validInducement.price : false;
          
          let mitigationTime: number | null = null;
          let breakerTime: number | null = null;
          const top = Math.max(candles[i].open, candles[i].close);
          const bottom = candles[i].low;
          
          for (let j = breakIndex; j < candles.length; j++) {
            if (candles[j].high >= bottom && mitigationTime === null) {
              mitigationTime = candles[j].time;
            }
            if (candles[j].close > top) {
              breakerTime = candles[j].time;
              break;
            }
          }
          
          const isUnmitigated = mitigationTime === null;

          candidates.push({
            candle: candles[i],
            top, bottom,
            checklist: {
              triggeredStructure,
              protectedByInducement: isAboveInducement,
              isUnmitigated,
              isClosestToInducement: false
            }
          });
        }
      }
    }

    // Evaluate Rule 4: Closest to inducement
    // The loop goes backwards from breakIndex, so the first one that is protected is the closest
    let bestCandidate = candidates.find(c => c.checklist.protectedByInducement);
    if (bestCandidate) {
      bestCandidate.checklist.isClosestToInducement = true;
    } else if (candidates.length > 0) {
      // If none are protected, just take the first one (closest to break) and fail Rule 2 and 4.
      bestCandidate = candidates[0];
    }

    if (!bestCandidate) return;

    // Determine final status
    let status: OrderBlock["status"] = "ACTIVE";
    let isBroken = false;
    let endTime = candles[candles.length - 1].time;

    if (bos.direction === "BULLISH") {
      for (let j = breakIndex; j < candles.length; j++) {
        if (candles[j].low <= bestCandidate.top && status === "ACTIVE") status = "MITIGATED";
        if (candles[j].close < bestCandidate.bottom) {
          status = "BREAKER";
          isBroken = true;
          endTime = candles[j].time;
          break;
        }
      }
    } else {
      for (let j = breakIndex; j < candles.length; j++) {
        if (candles[j].high >= bestCandidate.bottom && status === "ACTIVE") status = "MITIGATED";
        if (candles[j].close > bestCandidate.top) {
          status = "BREAKER";
          isBroken = true;
          endTime = candles[j].time;
          break;
        }
      }
    }

    // Only keep if it passed all rules, OR if it's a breaker (breakers are valid even if mitigated)
    // Actually, let's keep it if it triggered structure, and let the UI filter or just show them.
    // The prompt says: "run every candidate POI through the 4-rule checklist ... return pass/fail per rule, not just a final boolean".
    blocks.push({
      id: `${bos.direction.toLowerCase()}-ob-${bosIdx}`,
      type: bos.direction,
      top: bestCandidate.top,
      bottom: bestCandidate.bottom,
      startTime: bestCandidate.candle.time,
      endTime,
      status,
      isBroken,
      checklist: bestCandidate.checklist
    });
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

  const validBlocks = orderBlocks.filter(b => 
    b.checklist.triggeredStructure &&
    b.checklist.protectedByInducement &&
    (b.checklist.isUnmitigated || b.status === "BREAKER") &&
    b.checklist.isClosestToInducement
  );

  return {
    swingHighs,
    swingLows,
    bosEvents,
    orderBlocks: validBlocks.slice(-4),
    liquidityLevels: liquidityLevels.filter((l) => !l.swept).slice(-10),
    inducements,
  };
}

