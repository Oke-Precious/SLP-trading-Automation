import { SLPStructureResult, BOSEvent } from '../lib/slp/slpMarketStructure';
import { StructureTriggerEvent, InducementPoint } from '../lib/slp/slpInducement';
import { detectOrderBlocks, OrderBlockCandidate } from '../lib/slp/slpOrderBlock';
import { Candle } from '../lib/market/marketDataService';

// ============================================================================
// ASSUMPTION REGISTRY — TO BE VERIFIED AGAINST SOURCE IN PHASE 4
// ============================================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  IMPORTANT STRATEGY ASSUMPTIONS');
console.log('   The following rules are implemented based on reconstructed course notes:');
console.log('   - ENTRY LEVEL: Demarcation boundary of the engulfing candle (candle2.open).');
console.log('   - STOP LOSS: Wick extreme of the OB candle (candle1.low for Bullish OB, candle1.high for Bearish OB).');
console.log('   Please verify these against the full course material during Phase 4.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


// ============================================================================
// TEST 1: BTC/USD Bearish Reversal Case Study
// ============================================================================
function getTest1BTCData(): { candles: Candle[]; structure: SLPStructureResult } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 65000;

  for (let i = 0; i < 75; i++) {
    // Background candles
    let open = startPrice + i * 20;
    let close = open + 15;
    let high = close + 10;
    let low = open - 10;

    // Engulfing pattern (Bearish OB) at index 30-31
    if (i === 30) {
      // Candle 1: Bullish OB candle
      open = 65800; close = 65900; high = 65950; low = 65750;
    } else if (i === 31) {
      // Candle 2: Bearish Engulfing candle (fully engulfs C1's body)
      open = 65910; close = 65700; high = 65920; low = 65650;
    } else if (i === 35) {
      // Triggers MSS at index 35 (closes below index 20's swing low of 65000)
      open = 65200; close = 64900; high = 65300; low = 64800;
    }

    candles.push({
      time: baseTime + i * 900,
      open,
      high,
      low,
      close,
      volume: 1000
    });
  }

  // Structure contains a bearish MSS at index 35, breaking Swing Low at index 20
  const structure: SLPStructureResult = {
    timeframe: '15m',
    currentTrend: 'DOWNTREND',
    swingHighs: [],
    swingLows: [
      { index: 20, time: baseTime + 20 * 900, price: 65000, type: 'LOW', label: 'HL' }
    ],
    mssEvents: [
      {
        time: baseTime + 35 * 900,
        price: 65000,
        direction: 'BEARISH',
        brokenSwing: { index: 20, time: baseTime + 20 * 900, price: 65000, type: 'LOW', label: 'HL' },
        swingBroken: { index: 20, time: baseTime + 20 * 900, price: 65000, type: 'LOW', label: 'HL' },
        candleIndex: 35,
        earlyWarning: null
      }
    ],
    bosEvents: [],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  return { candles, structure };
}


// ============================================================================
// TEST 2: GBP/JPY 15-Minute Bullish Local Sequence (BOS + IDM Sweep + OB Setup)
// ============================================================================
function getTest2GBPJPY15MData(): { candles: Candle[]; structure: SLPStructureResult; idm: InducementPoint } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    // Standard upward candles
    let open = startPrice + i * 0.05;
    let close = open + 0.03;
    let high = close + 0.01;
    let low = open - 0.01;

    // Bullish OB Engulfing Pattern at index 30-31
    if (i === 30) {
      // Candle 1: Bearish OB candle
      open = 199.10; close = 198.90; high = 199.15; low = 198.85;
    } else if (i === 31) {
      // Candle 2: Bullish Engulfing (fully engulfs C1's body)
      open = 198.88; close = 199.20; high = 199.25; low = 198.85;
    } else if (i === 35) {
      // Bullish BOS (closes above index 20's swing high of 199.50)
      open = 199.60; close = 199.80; high = 199.90; low = 199.50;
    } else if (i === 45) {
      // Pullback forms Swing Low (IDM) at 199.30 (higher than OB zone top of 199.10)
      open = 199.45; close = 199.35; high = 199.50; low = 199.30;
    } else if (i === 55) {
      // Sweep below the IDM low (199.30)
      open = 199.40; close = 199.45; high = 199.50; low = 199.20; // Sweeps 199.30, stays above OB
    }

    candles.push({
      time: baseTime + i * 900,
      open,
      high,
      low,
      close,
      volume: 1000
    });
  }

  const trigger: StructureTriggerEvent = {
    kind: 'BOS',
    event: {
      time: baseTime + 35 * 900,
      price: 199.50,
      direction: 'BULLISH',
      brokenSwing: { index: 20, time: baseTime + 20 * 900, price: 199.50, type: 'HIGH', label: 'HH' },
      swingBroken: { index: 20, time: baseTime + 20 * 900, price: 199.50, type: 'HIGH', label: 'HH' },
      candleIndex: 35,
      isDouble: false,
      doubleSequence: [],
      lineFrom: baseTime + 20 * 900,
      lineTo: baseTime + 35 * 900,
    }
  };

  const structure: SLPStructureResult = {
    timeframe: '15m',
    currentTrend: 'UPTREND',
    swingHighs: [
      { index: 20, time: baseTime + 20 * 900, price: 199.50, type: 'HIGH', label: 'HH' }
    ],
    swingLows: [
      { index: 45, time: baseTime + 45 * 900, price: 199.30, type: 'LOW', label: 'HL' }
    ],
    mssEvents: [],
    bosEvents: [trigger.event as BOSEvent],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  const idm: InducementPoint = {
    id: 'idm-bos-0',
    time: baseTime + 45 * 900,
    price: 199.30,
    swingType: 'LOW',
    direction: 'BULLISH',
    candleIndex: 45,
    originTrigger: trigger,
    originConfidence: 'STANDARD',
    status: 'SWEPT',
    sweptAt: baseTime + 55 * 900,
    sweptCandleIndex: 55,
    invalidatedAt: null
  };

  return { candles, structure, idm };
}


// ============================================================================
// TEST 3: GBP/JPY 30-Minute Reversal (Former OB / Breaker Block Origin)
// ============================================================================
function getTest3GBPJPY30MData(): { candles: Candle[]; structure: SLPStructureResult } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    let open = startPrice - i * 0.05;
    let close = open - 0.03;
    let high = open + 0.01;
    let low = close - 0.01;

    // Bearish OB Engulfing Pattern at index 30-31
    if (i === 30) {
      // Candle 1: Bullish OB candle
      open = 198.10; close = 198.25; high = 198.30; low = 198.05;
    } else if (i === 31) {
      // Candle 2: Bearish Engulfing
      open = 198.26; close = 198.00; high = 198.30; low = 197.90;
    } else if (i === 35) {
      // Closes below swing low of 197.80
      open = 197.90; close = 197.50; high = 198.00; low = 197.40;
    }

    candles.push({
      time: baseTime + i * 1800,
      open,
      high,
      low,
      close,
      volume: 1000
    });
  }

  const structure: SLPStructureResult = {
    timeframe: '30m',
    currentTrend: 'DOWNTREND',
    swingHighs: [],
    swingLows: [
      { index: 20, time: baseTime + 20 * 1800, price: 197.80, type: 'LOW', label: 'LL' }
    ],
    mssEvents: [
      {
        time: baseTime + 35 * 1800,
        price: 197.80,
        direction: 'BEARISH',
        brokenSwing: { index: 20, time: baseTime + 20 * 1800, price: 197.80, type: 'LOW', label: 'LL' },
        swingBroken: { index: 20, time: baseTime + 20 * 1800, price: 197.80, type: 'LOW', label: 'LL' },
        candleIndex: 35,
        earlyWarning: null
      }
    ],
    bosEvents: [],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  return { candles, structure };
}


// ============================================================================
// VERIFICATION RUNNER
// ============================================================================
function runTests() {
  console.log('============================================================================');
  console.log('                 AUTO-SLP ORDER BLOCK (OB) TEST SUITE');
  console.log('============================================================================\n');

  // --- TEST 1 ---
  const t1 = getTest1BTCData();
  const obs1 = detectOrderBlocks(t1.candles, t1.structure);

  console.log('--- TEST 1: BTC/USD Bearish Reversal Case Study ---');
  console.log(`MSS Events Found: ${t1.structure.mssEvents.length}`);
  console.log(`Order Blocks Found: ${obs1.length}`);
  if (obs1.length > 0) {
    const ob = obs1[0];
    console.log(`✓ OB ID: ${ob.id}`);
    console.log(`✓ Direction: ${ob.direction} (Expected: BEARISH)`);
    console.log(`✓ OB Candle (C1) Index: ${ob.obCandleIndex} (Expected: 30)`);
    console.log(`✓ Engulfing Candle (C2) Index: ${ob.engulfingCandleIndex} (Expected: 31)`);
    console.log(`✓ Zone Top: ${ob.zoneTop} (Expected: 65900)`);
    console.log(`✓ Zone Bottom: ${ob.zoneBottom} (Expected: 65800)`);
    console.log(`✓ Entry Level (C2 Open): ${ob.entryLevel} (Expected: 65910) [ASSUMPTION — VERIFY]`);
    console.log(`✓ Stop Loss (C1 High): ${ob.stopLossLevel} (Expected: 65950) [ASSUMPTION — VERIFY]`);
  } else {
    console.log('❌ Failed to detect Bearish OB for BTC!');
  }
  console.log('\n------------------------------------------------\n');


  // --- TEST 2 ---
  const t2 = getTest2GBPJPY15MData();
  const obs2 = detectOrderBlocks(t2.candles, t2.structure);

  console.log('--- TEST 2: GBP/JPY 15-Minute Bullish Local Sequence ---');
  console.log(`BOS Events Found: ${t2.structure.bosEvents.length}`);
  console.log(`Inducement Swept: YES (IDM low: ${t2.idm.price})`);
  console.log(`Order Blocks Found: ${obs2.length}`);
  if (obs2.length > 0) {
    const ob = obs2[0];
    console.log(`✓ OB ID: ${ob.id}`);
    console.log(`✓ Direction: ${ob.direction} (Expected: BULLISH)`);
    console.log(`✓ OB Candle (C1) Index: ${ob.obCandleIndex} (Expected: 30)`);
    console.log(`✓ Engulfing Candle (C2) Index: ${ob.engulfingCandleIndex} (Expected: 31)`);
    console.log(`✓ Zone Top: ${ob.zoneTop} (Expected: 199.10)`);
    console.log(`✓ Zone Bottom: ${ob.zoneBottom} (Expected: 198.90)`);
    console.log(`✓ Entry Level (C2 Open): ${ob.entryLevel} (Expected: 198.88) [ASSUMPTION — VERIFY]`);
    console.log(`✓ Stop Loss (C1 Low): ${ob.stopLossLevel} (Expected: 198.85) [ASSUMPTION — VERIFY]`);

    // Spatial Relationship check: Bullish setup, OB must sit below IDM price level
    const obBelowIdm = ob.zoneTop < t2.idm.price;
    console.log(`✓ Spatial Check (OB is below IDM): ${obBelowIdm ? 'PASS' : 'FAIL'} (OB zone top ${ob.zoneTop} vs IDM ${t2.idm.price})`);
  } else {
    console.log('❌ Failed to detect Bullish OB for GBP/JPY 15M!');
  }
  console.log('\n------------------------------------------------\n');


  // --- TEST 3 ---
  const t3 = getTest3GBPJPY30MData();
  const obs3 = detectOrderBlocks(t3.candles, t3.structure);

  console.log('--- TEST 3: GBP/JPY 30-Minute Reversal (Breaker Origin) ---');
  console.log(`MSS Events Found: ${t3.structure.mssEvents.length}`);
  console.log(`Order Blocks Found: ${obs3.length}`);
  if (obs3.length > 0) {
    const ob = obs3[0];
    console.log(`✓ OB ID: ${ob.id}`);
    console.log(`✓ Direction: ${ob.direction} (Expected: BEARISH)`);
    console.log(`✓ OB Candle (C1) Index: ${ob.obCandleIndex} (Expected: 30)`);
    console.log(`✓ Zone Top: ${ob.zoneTop} (Expected: 198.25)`);
    console.log(`✓ Zone Bottom: ${ob.zoneBottom} (Expected: 198.10)`);
  } else {
    console.log('❌ Failed to detect underlying Bearish OB for GBP/JPY 30M!');
  }
  console.log('\n============================================================================');
  console.log('                     FULL DETECTED CANDIDATES JSON OUTPUT');
  console.log('============================================================================');
  
  const allTestOBs = [...obs1, ...obs2, ...obs3].map(ob => ({
    id: ob.id,
    direction: ob.direction,
    obCandleTime: ob.obCandle.time,
    obCandleIndex: ob.obCandleIndex,
    engulfingCandleIndex: ob.engulfingCandleIndex,
    zoneTop: ob.zoneTop,
    zoneBottom: ob.zoneBottom,
    entryLevel: ob.entryLevel,
    stopLossLevel: ob.stopLossLevel,
    originTriggerKind: ob.originTrigger.kind,
    originTriggerTime: ob.originTrigger.event.time
  }));

  console.log(JSON.stringify(allTestOBs, null, 2));
  console.log('============================================================================');
}

runTests();
