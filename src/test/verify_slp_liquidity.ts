import { selectTakeProfitTarget } from '../lib/slp/slpLiquidityTargets';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { SLPPOI } from '../lib/slp/slpPOI';
import { Candle } from '../lib/market/marketDataService';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 AUTO-SLP PHASE 5: LIQUIDITY TARGETS VERIFICATION SUITE');
console.log('   Verifying Tony\'s Case Studies (Tests 1-4) against SLP Engine logic');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function createBaseCandles(count: number, startPrice: number, rangeWidth: number): Candle[] {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  for (let i = 0; i < count; i++) {
    const o = startPrice + (Math.sin(i * 0.5) * rangeWidth);
    candles.push({
      time: baseTime + i * 900,
      open: o,
      high: o + 5,
      low: o - 5,
      close: o + 2,
      volume: 1000
    });
  }
  return candles;
}

const mockStructure: any = {
  timeframe: '15m',
  currentTrend: 'DOWNTREND',
  swingHighs: [],
  swingLows: [],
  mssEvents: [],
  bosEvents: [],
  doubleBOSEvents: [],
  analysedAt: Date.now()
};

// ============================================================================
// TEST 1: BTC/USD Bearish Reversal (Trendline Target Chosen)
// ============================================================================
function test1Trendline() {
  console.log('👉 Running Test 1: BTC/USD Bearish Reversal (Trendline Target Chosen)...');

  // Trend is Bearish (DOWNTREND). Setup: Valid BEARISH OB.
  // 4 ascending swing lows forming a rising trendline (Bullish Trendline).
  const candles = createBaseCandles(60, 65000, 20);
  const baseTime = candles[0].time;

  // Manually construct swing points for our trendline
  // Swing points: 4 ascending swing lows
  const swingLows = [
    { index: 10, time: baseTime + 10 * 900, price: 64800, type: 'LOW', label: 'HL' },
    { index: 20, time: baseTime + 20 * 900, price: 64850, type: 'LOW', label: 'HL' },
    { index: 30, time: baseTime + 30 * 900, price: 64900, type: 'LOW', label: 'HL' },
    { index: 40, time: baseTime + 40 * 900, price: 64950, type: 'LOW', label: 'HL' },
  ] as any[];

  const mssEvent = {
    time: baseTime + 45 * 900,
    price: 64800,
    direction: 'BEARISH' as const,
    brokenSwing: swingLows[0],
    swingBroken: swingLows[0],
    candleIndex: 45,
    earlyWarning: null,
    priorTrend: 'UPTREND' as const
  };

  const structure: SLPStructureResult = {
    ...mockStructure,
    currentTrend: 'DOWNTREND',
    swingLows,
    mssEvents: [mssEvent]
  } as any;

  const poi: SLPPOI = {
    id: 'poi-1',
    type: 'ORDER_BLOCK',
    direction: 'BEARISH',
    time: baseTime + 40 * 900,
    zoneTop: 65900,
    zoneBottom: 65800,
    entryLevel: 65800,
    stopLossLevel: 65950,
    displayLabel: 'Bearish OB',
    sourceOB: {
      id: 'ob-1',
      direction: 'BEARISH',
      zoneTop: 65900,
      zoneBottom: 65800,
      obCandleIndex: 30,
      obCandle: candles[30],
      engulfingCandle: candles[31],
      isValidCandidate: true
    } as any,
    originTrigger: {
      kind: 'MSS',
      event: mssEvent
    } as any,
    breakerFlipTime: null,
    validation: {
      allRulesPass: true,
      failedRules: []
    } as any
  } as any;

  const atr = 50;
  const selection = selectTakeProfitTarget(candles, structure, poi, atr);

  console.log(`   - Selected TP Target Type: ${selection.target?.kind || 'None'}`);
  console.log(`   - Selected TP Target Price: ${selection.targetPrice}`);
  console.log(`   - Explanation: ${selection.selectionReason}`);

  if (selection.target?.kind === 'TRENDLINE' && poi.direction === 'BEARISH') {
    console.log('   ✅ Test 1 PASSED: Trendline selected for Bearish trade into rising trendline (reversal pool).\n');
    return true;
  } else {
    console.log('   ❌ Test 1 FAILED: Trendline was not selected or selected incorrectly.\n');
    return false;
  }
}

// ============================================================================
// TEST 2: GBP/JPY Trendline Rejection (Fallback Chosen)
// ============================================================================
function test2TrendlineRejection() {
  console.log('👉 Running Test 2: GBP/JPY Trendline Rejection (Fallback Chosen)...');

  // Trend is Bullish (UPTREND). Setup: Valid BULLISH OB.
  // Trendline: 4 ascending swing lows (Bullish trendline).
  // Bullish trade targeting ascending lows would be trading with the trend, not a reversal pool.
  // It should reject trendline and fallback since range and EQ levels are also absent.
  const candles = createBaseCandles(60, 200, 0.5);
  const baseTime = candles[0].time;

  const swingLows = [
    { index: 10, time: baseTime + 10 * 900, price: 199.0, type: 'LOW', label: 'HL' },
    { index: 20, time: baseTime + 20 * 900, price: 199.3, type: 'LOW', label: 'HL' },
    { index: 30, time: baseTime + 30 * 900, price: 199.6, type: 'LOW', label: 'HL' },
    { index: 40, time: baseTime + 40 * 900, price: 199.9, type: 'LOW', label: 'HL' },
  ] as any[];

  const mssEvent = {
    time: baseTime + 45 * 900,
    price: 199.0,
    direction: 'BULLISH' as const,
    brokenSwing: swingLows[0],
    swingBroken: swingLows[0],
    candleIndex: 45,
    earlyWarning: null,
    priorTrend: 'DOWNTREND' as const // A bullish reversal setup
  };

  const structure: SLPStructureResult = {
    ...mockStructure,
    currentTrend: 'UPTREND',
    swingLows,
    mssEvents: [mssEvent]
  } as any;

  const poi: SLPPOI = {
    id: 'poi-2',
    type: 'ORDER_BLOCK',
    direction: 'BULLISH',
    time: baseTime + 40 * 900,
    zoneTop: 200.2,
    zoneBottom: 199.8,
    entryLevel: 200.0,
    stopLossLevel: 199.5,
    displayLabel: 'Bullish OB',
    sourceOB: {
      id: 'ob-2',
      direction: 'BULLISH',
      zoneTop: 200.2,
      zoneBottom: 199.8,
      obCandleIndex: 30,
      obCandle: candles[30],
      engulfingCandle: candles[31],
      isValidCandidate: true
    } as any,
    originTrigger: {
      kind: 'MSS',
      event: mssEvent
    } as any,
    breakerFlipTime: null,
    validation: {
      allRulesPass: true,
      failedRules: []
    } as any
  } as any;

  const atr = 0.4;
  const selection = selectTakeProfitTarget(candles, structure, poi, atr);

  console.log(`   - Selected TP Target Type: ${selection.target?.kind || 'None (Fallback / Default)'}`);
  console.log(`   - Selected TP Target Price: ${selection.targetPrice}`);
  console.log(`   - Explanation: ${selection.selectionReason}`);

  if (selection.target?.kind !== 'TRENDLINE') {
    console.log('   ✅ Test 2 PASSED: Trendline correctly rejected because Bullish trade into Bullish trendline is with trend, not reversal.\n');
    return true;
  } else {
    console.log('   ❌ Test 2 FAILED: Trendline was incorrectly selected.\n');
    return false;
  }
}

// ============================================================================
// TEST 3: Ranging Market (Type C Chosen)
// ============================================================================
function test3Ranging() {
  console.log('👉 Running Test 3: Ranging Market (Type C Chosen)...');

  // Setup: Valid BULLISH OB.
  // Market has been flat (all candles stay within a tight band over the last 40 bars).
  // Verify Ranging liquidity detected and selected.
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  for (let i = 0; i < 45; i++) {
    candles.push({
      time: baseTime + i * 900,
      open: 1.2500,
      high: 1.2505,
      low: 1.2495,
      close: 1.2500,
      volume: 100
    });
  }

  const structure: SLPStructureResult = {
    ...mockStructure,
    currentTrend: 'RANGING',
  } as any;

  const poi: SLPPOI = {
    id: 'poi-3',
    type: 'ORDER_BLOCK',
    direction: 'BULLISH',
    time: baseTime + 40 * 900,
    zoneTop: 1.2502,
    zoneBottom: 1.2494,
    entryLevel: 1.2496,
    stopLossLevel: 1.2490,
    displayLabel: 'Bullish OB',
    sourceOB: {
      id: 'ob-3',
      direction: 'BULLISH',
      zoneTop: 1.2502,
      zoneBottom: 1.2494,
      obCandleIndex: 30,
      obCandle: candles[30],
      engulfingCandle: candles[31],
      isValidCandidate: true
    } as any,
    originTrigger: {
      kind: 'BOS',
      event: {
        time: baseTime + 35 * 900,
        price: 1.2500,
        direction: 'BULLISH' as const,
        lineFrom: baseTime + 10 * 900,
        lineTo: baseTime + 35 * 900,
        candleIndex: 35
      }
    } as any,
    breakerFlipTime: null,
    validation: {
      allRulesPass: true,
      failedRules: []
    } as any
  } as any;

  const atr = 0.0010;
  const selection = selectTakeProfitTarget(candles, structure, poi, atr);

  console.log(`   - Selected TP Target Type: ${selection.target?.kind || 'None'}`);
  console.log(`   - Selected TP Target Price: ${selection.targetPrice}`);
  console.log(`   - Explanation: ${selection.selectionReason}`);

  if (selection.target?.kind === 'RANGE_HIGH') {
    console.log('   ✅ Test 3 PASSED: Range High target detected and selected in flat ranging market.\n');
    return true;
  } else {
    console.log('   ❌ Test 3 FAILED: Range High was not selected or selected incorrectly.\n');
    return false;
  }
}

// ============================================================================
// TEST 4: Equal Levels (Type B Chosen)
// ============================================================================
function test4EqualLevels() {
  console.log('👉 Running Test 4: Equal Levels (Type B Chosen)...');

  // Setup: Valid BULLISH OB.
  // Multiple candles touch within 0.15 ATR of a ceiling.
  // Verify Equal Highs detected and selected as TP1.
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  for (let i = 0; i < 50; i++) {
    let open = 1.1000;
    let high = 1.1049;
    let low = 1.0950;
    let close = 1.1000;

    // Touches at ceiling 1.1050
    if (i === 10 || i === 25 || i === 35) {
      high = 1.1050;
    }

    candles.push({
      time: baseTime + i * 900,
      open, high, low, close,
      volume: 100
    });
  }

  const swingHighs = [
    { index: 10, time: baseTime + 10 * 900, price: 1.1050, type: 'HIGH', label: 'HL' },
    { index: 25, time: baseTime + 25 * 900, price: 1.1050, type: 'HIGH', label: 'HL' },
    { index: 35, time: baseTime + 35 * 900, price: 1.1050, type: 'HIGH', label: 'HL' },
  ] as any[];

  const structure: SLPStructureResult = {
    ...mockStructure,
    currentTrend: 'DOWNTREND',
    swingHighs,
  } as any;

  const poi: SLPPOI = {
    id: 'poi-4',
    type: 'ORDER_BLOCK',
    direction: 'BULLISH',
    time: baseTime + 40 * 900,
    zoneTop: 1.0980,
    zoneBottom: 1.0940,
    entryLevel: 1.0960,
    stopLossLevel: 1.0930,
    displayLabel: 'Bullish OB',
    sourceOB: {
      id: 'ob-4',
      direction: 'BULLISH',
      zoneTop: 1.0980,
      zoneBottom: 1.0940,
      obCandleIndex: 30,
      obCandle: candles[30],
      engulfingCandle: candles[31],
      isValidCandidate: true
    } as any,
    originTrigger: {
      kind: 'BOS',
      event: {
        time: baseTime + 35 * 900,
        price: 1.0960,
        direction: 'BULLISH' as const,
        lineFrom: baseTime + 10 * 900,
        lineTo: baseTime + 35 * 900,
        candleIndex: 35
      }
    } as any,
    breakerFlipTime: null,
    validation: {
      allRulesPass: true,
      failedRules: []
    } as any
  } as any;

  const atr = 0.0100; // tolerance is atr * 0.15 = 0.0015. 1.1050 touches match exactly.
  const selection = selectTakeProfitTarget(candles, structure, poi, atr);

  console.log(`   - Selected TP Target Type: ${selection.target?.kind || 'None'}`);
  console.log(`   - Selected TP Target Price: ${selection.targetPrice}`);
  console.log(`   - Explanation: ${selection.selectionReason}`);

  if (selection.target?.kind === 'EQUAL_HIGHS') {
    console.log('   ✅ Test 4 PASSED: Equal Highs detected and selected as TP1.\n');
    return true;
  } else {
    console.log('   ❌ Test 4 FAILED: Equal Highs target was not selected.\n');
    return false;
  }
}

// Run All Tests
function runAll() {
  let success = true;
  success = test1Trendline() && success;
  success = test2TrendlineRejection() && success;
  success = test3Ranging() && success;
  success = test4EqualLevels() && success;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (success) {
    console.log('🎉 ALL PHASE 5 LIQUIDITY TARGET VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('🚨 SOME VERIFICATION TESTS FAILED.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runAll();
