import { Candle } from '../market/marketDataService';
import { SLPBias, SLPBiasResult, analyseSLPBias } from './slpBias';
import { SLPStructureResult, detectSLPStructure } from './slpStructure';
import { LiquidityLevel, detectSLPLiquidity } from './slpLiquidity';
import { SLPPOI, detectSLPPOIs } from './slpPOI';
import { detectOrderBlocks } from './slpOrderBlock';
import { detectInducements } from './slpInducement';

export type SetupStatus =
  | 'WAITING_FOR_BIAS'         // no clear bias yet
  | 'WAITING_FOR_MSS'          // bias found, watching for MSS
  | 'WAITING_FOR_BOS'          // MSS found, watching for BOS
  | 'WAITING_FOR_LIQUIDITY'    // BOS confirmed, waiting for liquidity sweep
  | 'WAITING_FOR_RETRACEMENT'  // liquidity swept, waiting for 50% pullback to POI
  | 'SETUP_VALID'              // ALL conditions met — this is a valid SLP setup
  | 'SETUP_INVALIDATED';       // price broke the POI without a valid entry

export interface SLPSetup {
  status:              SetupStatus;
  bias:                SLPBiasResult;
  structure:           SLPStructureResult;
  liquidityLevels:     LiquidityLevel[];
  validPOIs:           SLPPOI[];
  activePOI:           SLPPOI | null;
  retracementCheck:    RetracementCheck | null;
  signal:              SLPSignal | null;
  statusMessage:       string;     // plain English for the user
  nextStep:            string;     // what to watch for next
}

export interface RetracementCheck {
  poi:                SLPPOI;
  currentPrice:       number;
  poiMidPrice:        number;    // the 50% level
  retracementReached: boolean;   // has price pulled back to 50%?
  retracementPercent: number;    // how far has price retraced into the POI (%)
}

export interface SLPSignal {
  pair:          string;
  timeframe:     string;
  direction:     'LONG' | 'SHORT';
  entryPrice:    number;    // at the 50% level of the POI
  stopLoss:      number;    // below the POI bottom (bull) or above POI top (bear)
  target1:       number;    // nearest opposing liquidity level
  target2:       number | null;   // next opposing liquidity level (if exists)
  rrRatio:       number;    // risk:reward ratio
  poiRef:        SLPPOI;    // the POI this signal is based on
  generatedAt:   number;    // timestamp
  isValid:       boolean;   // passes all SLP rules
}

// ── 50% RETRACEMENT CHECK ────────────────────────────

function checkRetracement(
  poi:          SLPPOI,
  currentPrice: number
): RetracementCheck {
  const zoneSize = Math.abs(poi.zoneTop - poi.zoneBottom) || 0.000001;
  const midpoint = poi.entryLevel;

  let retracementPercent = 0;
  let reached = false;

  if (poi.direction === 'BULLISH') {
    if (currentPrice <= poi.zoneTop) {
      const distanceIn = poi.zoneTop - currentPrice;
      retracementPercent = (distanceIn / zoneSize) * 100;
      reached = currentPrice <= midpoint;
    }
  } else {
    if (currentPrice >= poi.zoneBottom) {
      const distanceIn = currentPrice - poi.zoneBottom;
      retracementPercent = (distanceIn / zoneSize) * 100;
      reached = currentPrice >= midpoint;
    }
  }

  return {
    poi,
    currentPrice,
    poiMidPrice:        midpoint,
    retracementReached: reached,
    retracementPercent: Math.min(Math.max(retracementPercent, 0), 100),
  };
}

// ── SIGNAL GENERATION ────────────────────────────────

function generateSignal(
  poi:         SLPPOI,
  retracement: RetracementCheck,
  candles:     Candle[],
  liquidityLevels: LiquidityLevel[],
  pair:        string,
  timeframe:   string
): SLPSignal | null {
  if (!retracement.retracementReached) return null;
  if (!poi.validation.allRulesPass) return null;

  const currentPrice = retracement.currentPrice;
  const direction = poi.direction === 'BULLISH' ? 'LONG' : 'SHORT';

  // Entry at current price (within the POI zone at or below 50%)
  const entryPrice = currentPrice;

  // Stop loss: just beyond the POI boundary
  const buffer = entryPrice * 0.001;
  const stopLoss = direction === 'LONG'
    ? poi.zoneBottom - buffer
    : poi.zoneTop + buffer;

  // Target: nearest opposing liquidity level
  const riskAmount = Math.abs(entryPrice - stopLoss) || 0.000001;
  const opposingLiquidity = liquidityLevels.filter(l =>
    direction === 'LONG'
      ? l.side === 'BUY_SIDE'  && l.price > entryPrice && !l.swept
      : l.side === 'SELL_SIDE' && l.price < entryPrice && !l.swept
  ).sort((a, b) =>
    direction === 'LONG'
      ? a.price - b.price
      : b.price - a.price
  );

  const target1 = opposingLiquidity[0]?.price
    ?? (direction === 'LONG'
      ? entryPrice + riskAmount * 2
      : entryPrice - riskAmount * 2);

  const target2 = opposingLiquidity[1]?.price ?? null;

  const rrRatio = Math.abs(target1 - entryPrice) / riskAmount;

  if (rrRatio < 1.5) return null;

  return {
    pair,
    timeframe,
    direction,
    entryPrice,
    stopLoss,
    target1,
    target2,
    rrRatio: parseFloat(rrRatio.toFixed(2)),
    poiRef: poi,
    generatedAt: Date.now(),
    isValid: true,
  };
}

// ── MASTER PIPELINE FUNCTION ─────────────────────────

export function runSLPPipeline(
  candles:   Candle[],
  timeframe: string,
  pair:      string
): SLPSetup {
  // ── Step 1: BIAS ────────────────────────────────
  const bias = analyseSLPBias(candles, timeframe);
  if (bias.bias === 'NEUTRAL') {
    return {
      status: 'WAITING_FOR_BIAS',
      bias,
      structure: { mssEvents: [], bosEvents: [] } as any,
      liquidityLevels: [],
      validPOIs: [],
      activePOI: null,
      retracementCheck: null,
      signal: null,
      statusMessage: 'No clear bias. Market structure is mixed.',
      nextStep: 'Wait for 2+ consecutive HH+HL (bullish) or LH+LL (bearish) to form.',
    };
  }

  // ── Step 2 & 3: MSS + BOS ───────────────────────
  const structure = detectSLPStructure(
    candles, timeframe, bias.bias, bias.swingHighs, bias.swingLows
  );
  if (structure.mssEvents.length === 0) {
    return {
      status: 'WAITING_FOR_MSS',
      bias,
      structure,
      liquidityLevels: [],
      validPOIs: [],
      activePOI: null,
      retracementCheck: null,
      signal: null,
      statusMessage: `Bias is ${bias.bias}. Watching for MSS in ${bias.bias.toLowerCase()} direction.`,
      nextStep: `Wait for a candle to close ${bias.bias === 'BULLISH' ? 'above the last swing high' : 'below the last swing low'}.`,
    };
  }
  if (structure.bosEvents.length === 0) {
    return {
      status: 'WAITING_FOR_BOS',
      bias,
      structure,
      liquidityLevels: [],
      validPOIs: [],
      activePOI: null,
      retracementCheck: null,
      signal: null,
      statusMessage: `MSS detected. Waiting for BOS to confirm the structure shift.`,
      nextStep: `Wait for price to close beyond the next significant swing ${bias.bias === 'BULLISH' ? 'high' : 'low'}.`,
    };
  }

  // ── Step 4: LIQUIDITY ───────────────────────────
  const atr = calcATR(candles, 14);
  const liquidityLevels = detectSLPLiquidity(
    candles, bias.swingHighs, bias.swingLows, bias.bias, atr
  );
  const hasSweptLiquidity = liquidityLevels.some(l => l.swept);
  if (!hasSweptLiquidity) {
    return {
      status: 'WAITING_FOR_LIQUIDITY',
      bias,
      structure,
      liquidityLevels,
      validPOIs: [],
      activePOI: null,
      retracementCheck: null,
      signal: null,
      statusMessage: `BOS confirmed. Waiting for liquidity sweep before entry.`,
      nextStep: `Watch for price to sweep one of the ${liquidityLevels.length} identified liquidity levels.`,
    };
  }

  // ── Step 5: POI VALIDATION ──────────────────────
  const orderBlocks = detectOrderBlocks(candles, structure);
  const inducements = detectInducements(candles, structure);
  const allPOIs = detectSLPPOIs(candles, structure, orderBlocks, inducements);
  const validPOIs = allPOIs.filter(p => p.validation.allRulesPass);

  if (validPOIs.length === 0) {
    return {
      status: 'WAITING_FOR_LIQUIDITY',
      bias,
      structure,
      liquidityLevels,
      validPOIs: [],
      activePOI: null,
      retracementCheck: null,
      signal: null,
      statusMessage: `Liquidity swept but no valid POI passes all 4 SLP rules yet.`,
      nextStep: `Wait for price to form a new OB at a zone that is protected and unmitigated.`,
    };
  }

  const activePOI = validPOIs[0];

  // ── Step 6: 50% RETRACEMENT ─────────────────────
  const currentPrice = candles[candles.length - 1].close;
  const retracementCheck = checkRetracement(activePOI, currentPrice);

  if (!retracementCheck.retracementReached) {
    return {
      status: 'WAITING_FOR_RETRACEMENT',
      bias,
      structure,
      liquidityLevels,
      validPOIs,
      activePOI,
      retracementCheck,
      signal: null,
      statusMessage: `Valid POI found. Waiting for 50% retracement into zone. Currently at ${retracementCheck.retracementPercent.toFixed(0)}%.`,
      nextStep: `Wait for price to pull back to ${activePOI.entryLevel.toFixed(4)} (50% of the POI zone).`,
    };
  }

  // ── ALL STEPS PASSED — Generate Signal ──────────
  const signal = generateSignal(
    activePOI, retracementCheck, candles, liquidityLevels, pair, timeframe
  );

  return {
    status: signal ? 'SETUP_VALID' : 'WAITING_FOR_RETRACEMENT',
    bias,
    structure,
    liquidityLevels,
    validPOIs,
    activePOI,
    retracementCheck,
    signal,
    statusMessage: signal
      ? `✅ VALID SLP SETUP — ${signal.direction} at ${signal.entryPrice.toFixed(4)} | SL: ${signal.stopLoss.toFixed(4)} | TP1: ${signal.target1.toFixed(4)} | R:R ${signal.rrRatio}`
      : `POI reached but R:R below 1.5 — monitor only.`,
    nextStep: signal ? 'All SLP conditions met. Wait for entry candle confirmation.' : 'Monitor price action.',
  };
}

function calcATR(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 0;
  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - arr[i - 1].close),
      Math.abs(c.low - arr[i - 1].close)
    );
  });
  return trs.slice(1).reduce((a, b) => a + b, 0) / period;
}
