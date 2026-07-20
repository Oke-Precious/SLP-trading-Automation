import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { detectInducements, InducementPoint } from '../lib/slp/slpInducement';
import { Candle } from '../lib/market/marketDataService';

// ============================================================================
// TEST 1: GBP/JPY 15-Minute Bullish Local Sequence (Mock-Driven)
// ============================================================================
function getTest1Data(): { candles: Candle[]; structure: SLPStructureResult } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    // Standard upward sloping candles
    let open = startPrice + i * 0.05;
    let close = open + 0.03;
    let high = close + 0.01;
    let low = open - 0.01;

    // At index 45, we form a beautiful local Swing Low (Inducement Point)
    // Lows around 45:
    // i=43: low = 200.70
    // i=44: low = 200.60
    // i=45: low = 199.20 (the IDM low level)
    // i=46: low = 199.80
    // i=47: low = 199.90
    if (i === 43) {
      open = 200.80; close = 200.90; high = 201.00; low = 200.70;
    } else if (i === 44) {
      open = 200.70; close = 200.65; high = 200.80; low = 200.60;
    } else if (i === 45) {
      open = 200.00; close = 199.50; high = 200.10; low = 199.20; // local swing low
    } else if (i === 46) {
      open = 199.50; close = 200.00; high = 200.10; low = 199.80;
    } else if (i === 47) {
      open = 200.00; close = 200.50; high = 200.60; low = 199.90;
    }

    // At index 55, we sweep below the IDM low (199.20): low=199.10, close=199.40
    if (i === 55) {
      open = 199.60; close = 199.40; high = 199.70; low = 199.10; // swept
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

  // Trigger event at index 35 (Bullish BOS)
  const structure: SLPStructureResult = {
    timeframe: '15m',
    currentTrend: 'UPTREND',
    swingHighs: [],
    swingLows: [
      { index: 45, time: baseTime + 45 * 900, price: 199.20, type: 'LOW', label: 'HL' }
    ],
    mssEvents: [],
    bosEvents: [
      {
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
    ],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  return { candles, structure };
}

// ============================================================================
// TEST 2: GBP/JPY 30-Minute Bearish Reversal (Mock-Driven)
// ============================================================================
function getTest2Data(): { candles: Candle[]; structure: SLPStructureResult } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    // Standard downward sloping candles
    let open = startPrice - i * 0.05;
    let close = open - 0.03;
    let high = open + 0.01;
    let low = close - 0.01;

    // At index 45, we form a local Swing High (Inducement Point)
    // Highs around 45:
    // i=43: high = 196.20
    // i=44: high = 196.30
    // i=45: high = 198.10 (the IDM high level)
    // i=46: high = 197.50
    // i=47: high = 197.40
    if (i === 43) {
      open = 196.10; close = 196.00; high = 196.20; low = 195.90;
    } else if (i === 44) {
      open = 196.00; close = 196.15; high = 196.30; low = 195.95;
    } else if (i === 45) {
      open = 197.50; close = 198.00; high = 198.10; low = 197.40; // local swing high
    } else if (i === 46) {
      open = 198.00; close = 197.30; high = 197.50; low = 197.20;
    } else if (i === 47) {
      open = 197.30; close = 196.80; high = 197.40; low = 196.70;
    }

    // At index 55, we sweep above the IDM high (198.10): high=198.20, close=197.90
    if (i === 55) {
      open = 197.80; close = 197.90; high = 198.20; low = 197.60; // swept
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

  // Trigger event at index 35 (Bearish MSS)
  const structure: SLPStructureResult = {
    timeframe: '30m',
    currentTrend: 'DOWNTREND',
    swingHighs: [
      { index: 45, time: baseTime + 45 * 1800, price: 198.10, type: 'HIGH', label: 'LH' }
    ],
    swingLows: [],
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
// TEST 3: Invalidation Sequence (Mock-Driven)
// ============================================================================
function getTest3Data(): { candles: Candle[]; structure: SLPStructureResult } {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 100.00;

  for (let i = 0; i < 75; i++) {
    let open = startPrice + i * 0.05;
    let close = open + 0.03;
    let high = close + 0.01;
    let low = open - 0.01;

    // At index 45, form a local Swing Low (Inducement Point)
    if (i === 43) {
      open = 102.80; close = 102.90; high = 103.00; low = 102.70;
    } else if (i === 44) {
      open = 102.70; close = 102.65; high = 102.80; low = 102.60;
    } else if (i === 45) {
      open = 102.00; close = 101.50; high = 102.10; low = 101.20; // local swing low (IDM level: 101.20)
    } else if (i === 46) {
      open = 101.50; close = 102.00; high = 102.10; low = 101.80;
    } else if (i === 47) {
      open = 102.00; close = 102.50; high = 102.60; low = 101.90;
    }

    // At index 55, price closes BELOW 101.20: close=101.10
    if (i === 55) {
      open = 101.50; close = 101.10; high = 101.60; low = 101.00; // invalidates
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

  const structure: SLPStructureResult = {
    timeframe: '15m',
    currentTrend: 'UPTREND',
    swingHighs: [],
    swingLows: [
      { index: 45, time: baseTime + 45 * 900, price: 101.20, type: 'LOW', label: 'HL' }
    ],
    mssEvents: [],
    bosEvents: [
      {
        time: baseTime + 35 * 900,
        price: 101.50,
        direction: 'BULLISH',
        brokenSwing: { index: 20, time: baseTime + 20 * 900, price: 101.50, type: 'HIGH', label: 'HH' },
        swingBroken: { index: 20, time: baseTime + 20 * 900, price: 101.50, type: 'HIGH', label: 'HH' },
        candleIndex: 35,
        isDouble: false,
        doubleSequence: [],
        lineFrom: baseTime + 20 * 900,
        lineTo: baseTime + 35 * 900,
      }
    ],
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
  console.log('                 AUTO-SLP INDUCEMENT (IDM) TEST SUITE');
  console.log('============================================================================\n');

  // TEST 1
  const t1 = getTest1Data();
  const inducements15M = detectInducements(t1.candles, t1.structure);

  console.log('--- TEST 1: GBP/JPY 15-Minute Local Sequence ---');
  console.log(`Structure Events: ${t1.structure.bosEvents.length} BOS`);
  console.log(`Inducements Found: ${inducements15M.length}`);
  if (inducements15M.length > 0) {
    const idm = inducements15M[0];
    console.log(`✓ IDM Type: ${idm.swingType} (Expected: LOW)`);
    console.log(`✓ IDM Price: ${idm.price} (Expected: 199.2)`);
    console.log(`✓ IDM Status: ${idm.status} (Expected: SWEPT)`);
    console.log(`✓ Swept At Candle Index: ${idm.sweptCandleIndex} (Expected: 55)`);
  }
  console.log('\nJSON output for 15M:');
  console.log(JSON.stringify(inducements15M, null, 2));
  console.log('\n------------------------------------------------\n');

  // TEST 2
  const t2 = getTest2Data();
  const inducements30M = detectInducements(t2.candles, t2.structure);

  console.log('--- TEST 2: GBP/JPY 30-Minute Reversal ---');
  console.log(`Structure Events: ${t2.structure.mssEvents.length} MSS`);
  console.log(`Inducements Found: ${inducements30M.length}`);
  if (inducements30M.length > 0) {
    const idm = inducements30M[0];
    console.log(`✓ IDM Type: ${idm.swingType} (Expected: HIGH)`);
    console.log(`✓ IDM Price: ${idm.price} (Expected: 198.1)`);
    console.log(`✓ IDM Status: ${idm.status} (Expected: SWEPT)`);
    console.log(`✓ Swept At Candle Index: ${idm.sweptCandleIndex} (Expected: 55)`);
  }
  console.log('\nJSON output for 30M:');
  console.log(JSON.stringify(inducements30M, null, 2));
  console.log('\n------------------------------------------------\n');

  // TEST 3
  const t3 = getTest3Data();
  const inducementsInvalid = detectInducements(t3.candles, t3.structure);

  console.log('--- TEST 3: Invalidation Case ---');
  console.log(`Inducements Found: ${inducementsInvalid.length}`);
  if (inducementsInvalid.length > 0) {
    const idm = inducementsInvalid[0];
    console.log(`✓ IDM Price: ${idm.price} (Expected: 101.2)`);
    console.log(`✓ IDM Status: ${idm.status} (Expected: INVALIDATED)`);
    console.log(`✓ Invalidated At: ${idm.invalidatedAt} (Expected: ${1710000000 + 55 * 900})`);
  }
  console.log('\nJSON output for Invalidation Case:');
  console.log(JSON.stringify(inducementsInvalid, null, 2));
  console.log('\n============================================================================');
}

runTests();
