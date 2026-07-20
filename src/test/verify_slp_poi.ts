import { SLPStructureResult, BOSEvent } from '../lib/slp/slpMarketStructure';
import { StructureTriggerEvent, InducementPoint } from '../lib/slp/slpInducement';
import { detectOrderBlocks, OrderBlockCandidate } from '../lib/slp/slpOrderBlock';
import { detectSLPPOIs, SLPPOI } from '../lib/slp/slpPOI';
import { Candle } from '../lib/market/marketDataService';

// ============================================================================
// ASSUMPTION REGISTRY & WARPING REGISTER (PHASE 4 MANDATE)
// ============================================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  IMPORTANT STRATEGY ASSUMPTIONS — VERIFY AGAINST SOURCE');
console.log('   The following rules are implemented based on reconstructed course notes:');
console.log('   - ENTRY LEVEL: Demarcation boundary of the engulfing candle (candle2.open).');
console.log('   - STOP LOSS: Wick extreme of the OB candle (candle1.low for Bullish OB, candle1.high for Bearish OB).');
console.log('   - RULE 1 PROVISIONAL FLAG: A POI originating from a plain BOS (not MSS or DBS) raises');
console.log('     a provisional warning rather than being discarded silently.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


// ============================================================================
// TEST 1: BTC/USD Bearish Reversal Case Study (Rule 1-4 pass)
// ============================================================================
function getTest1BTCData() {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 65000;

  for (let i = 0; i < 75; i++) {
    let open = startPrice + i * 20;
    let close = open + 15;
    let high = close + 10;
    let low = open - 10;

    if (i === 30) {
      // Candle 1: Bullish OB candle
      open = 65800; close = 65900; high = 65950; low = 65750;
    } else if (i === 31) {
      // Candle 2: Bearish Engulfing (zone bottom 65800, top 65900)
      open = 65910; close = 65700; high = 65920; low = 65650;
    } else if (i === 35) {
      // Triggers MSS (closes below swing low of 65000)
      open = 65200; close = 64900; high = 65300; low = 64800;
    }

    candles.push({
      time: baseTime + i * 900,
      open, high, low, close,
      volume: 1000
    });
  }

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

  const trigger: StructureTriggerEvent = {
    kind: 'MSS',
    event: structure.mssEvents[0]
  };

  const inducements: InducementPoint[] = [
    {
      id: 'idm-btc-0',
      time: baseTime + 32 * 900,
      price: 65850,
      swingType: 'HIGH',
      direction: 'BEARISH',
      candleIndex: 32,
      originTrigger: trigger,
      originConfidence: 'STANDARD',
      status: 'SWEPT',
      sweptAt: baseTime + 33 * 900,
      sweptCandleIndex: 33,
      invalidatedAt: null
    }
  ];

  return { candles, structure, inducements };
}


// ============================================================================
// TEST 2: GBP/JPY 15M (Plain BOS -> Rule 1 Provisional Warning)
// ============================================================================
function getTest2GBPJPY15MData() {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    let open = startPrice + i * 0.05;
    let close = open + 0.03;
    let high = close + 0.01;
    let low = open - 0.01;

    if (i === 30) {
      open = 199.10; close = 198.90; high = 199.15; low = 198.85;
    } else if (i === 31) {
      open = 198.88; close = 199.20; high = 199.25; low = 198.85;
    } else if (i === 35) {
      open = 199.60; close = 199.80; high = 199.90; low = 199.50;
    }

    candles.push({
      time: baseTime + i * 900,
      open, high, low, close,
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
    swingLows: [],
    mssEvents: [],
    bosEvents: [trigger.event as BOSEvent],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  const inducements: InducementPoint[] = [
    {
      id: 'idm-gbpjpy-0',
      time: baseTime + 33 * 900,
      price: 199.00,
      swingType: 'LOW',
      direction: 'BULLISH',
      candleIndex: 33,
      originTrigger: trigger,
      originConfidence: 'STANDARD',
      status: 'SWEPT',
      sweptAt: baseTime + 34 * 900,
      sweptCandleIndex: 34,
      invalidatedAt: null
    }
  ];

  return { candles, structure, inducements };
}


// ============================================================================
// TEST 3: GBP/JPY 30M (Breaker Block Reclassification & Rule 3 Mitigation Start Time)
// ============================================================================
function getTest3GBPJPY30MData() {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 198.50;

  for (let i = 0; i < 75; i++) {
    let open = startPrice - i * 0.05;
    let close = open - 0.03;
    let high = open + 0.01;
    let low = close - 0.01;

    if (i === 30) {
      // Bearish OB (zone bottom 198.10, top 198.25)
      open = 198.10; close = 198.25; high = 198.30; low = 198.05;
    } else if (i === 31) {
      open = 198.26; close = 198.00; high = 198.30; low = 197.90;
    } else if (i === 35) {
      open = 197.90; close = 197.50; high = 198.00; low = 197.40;
    } else if (i === 40) {
      // Breakthrough: closes fully above Bearish OB (above 198.25)
      open = 198.20; close = 198.40; high = 198.50; low = 198.10;
    }

    candles.push({
      time: baseTime + i * 1800,
      open, high, low, close,
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

  const trigger: StructureTriggerEvent = {
    kind: 'MSS',
    event: structure.mssEvents[0]
  };

  const inducements: InducementPoint[] = [
    {
      id: 'idm-breaker-0',
      time: baseTime + 36 * 1800,
      price: 198.15,
      swingType: 'HIGH',
      direction: 'BULLISH', //flipped breaker block setup
      candleIndex: 36,
      originTrigger: trigger,
      originConfidence: 'STANDARD',
      status: 'SWEPT',
      sweptAt: baseTime + 37 * 1800,
      sweptCandleIndex: 37,
      invalidatedAt: null
    }
  ];

  return { candles, structure, inducements };
}


// ============================================================================
// TEST 4: Rule 4 Competitive Selection (Only closest POI to swept IDM is valid)
// ============================================================================
function getTest4CompetitiveData() {
  const candles: Candle[] = [];
  const baseTime = 1710000000;
  const startPrice = 100.00;

  for (let i = 0; i < 75; i++) {
    let open = startPrice + i * 0.5;
    let close = open + 0.3;
    let high = close + 0.1;
    let low = open - 0.1;

    // Two Bullish OB structures
    if (i === 15) {
      // OB 1 (further/lower)
      open = 107.00; close = 106.00; high = 107.20; low = 105.80;
    } else if (i === 16) {
      open = 105.90; close = 108.00; high = 108.20; low = 105.80;
    } else if (i === 30) {
      // OB 2 (closer/higher)
      open = 114.00; close = 113.00; high = 114.20; low = 112.80;
    } else if (i === 31) {
      open = 112.90; close = 115.00; high = 115.20; low = 112.80;
    } else if (i === 35) {
      // MSS break
      open = 116.00; close = 118.00; high = 118.50; low = 115.80;
    }

    candles.push({
      time: baseTime + i * 900,
      open, high, low, close,
      volume: 1000
    });
  }

  const structure: SLPStructureResult = {
    timeframe: '15m',
    currentTrend: 'UPTREND',
    swingHighs: [],
    swingLows: [
      { index: 10, time: baseTime + 10 * 900, price: 104.00, type: 'LOW', label: 'HL' }
    ],
    mssEvents: [
      {
        time: baseTime + 35 * 900,
        price: 104.00,
        direction: 'BULLISH',
        brokenSwing: { index: 10, time: baseTime + 10 * 900, price: 104.00, type: 'LOW', label: 'HL' },
        swingBroken: { index: 10, time: baseTime + 10 * 900, price: 104.00, type: 'LOW', label: 'HL' },
        candleIndex: 35,
        earlyWarning: null
      }
    ],
    bosEvents: [],
    doubleBOSEvents: [],
    analysedAt: Date.now()
  };

  const trigger: StructureTriggerEvent = {
    kind: 'MSS',
    event: structure.mssEvents[0]
  };

  const inducements: InducementPoint[] = [
    {
      id: 'idm-comp-0',
      time: baseTime + 36 * 900,
      price: 114.50, // Swept IDM price
      swingType: 'LOW',
      direction: 'BULLISH',
      candleIndex: 36,
      originTrigger: trigger,
      originConfidence: 'STANDARD',
      status: 'SWEPT',
      sweptAt: baseTime + 37 * 900,
      sweptCandleIndex: 37,
      invalidatedAt: null
    }
  ];

  return { candles, structure, inducements };
}


// ============================================================================
// VERIFICATION RUNNER
// ============================================================================
function runAllPOITests() {
  console.log('============================================================================');
  console.log('              AUTO-SLP POI DETECTOR & 4-RULE VALIDATION SUITE');
  console.log('============================================================================\n');

  // --- CASE STUDY 1 ---
  const cs1 = getTest1BTCData();
  const obs1 = detectOrderBlocks(cs1.candles, cs1.structure);
  const pois1 = detectSLPPOIs(cs1.candles, cs1.structure, obs1, cs1.inducements);

  console.log('--- TEST 1: BTC/USD Bearish Reversal Case Study ---');
  console.log(`Order Blocks Found: ${obs1.length}`);
  console.log(`Total POIs Evaluated: ${pois1.length}`);
  const validPois1 = pois1.filter(p => p.validation.allRulesPass);
  console.log(`Valid POIs Found (allRulesPass === true): ${validPois1.length}`);
  if (validPois1.length > 0) {
    const poi = validPois1[0];
    console.log(`✓ POI ID: ${poi.id}`);
    console.log(`✓ Type: ${poi.type}`);
    console.log(`✓ Direction: ${poi.direction} (Expected: BEARISH)`);
    console.log(`✓ Rule 1 (Valid Trigger): ${poi.validation.rule1_validTrigger ? 'PASS' : 'FAIL'} (${poi.validation.rule1_note})`);
    console.log(`✓ Rule 2 (Swept IDM matched): ${poi.validation.rule2_hasSweptInducement ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Rule 3 (Unmitigated body check): ${poi.validation.rule3_unmitigated ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Rule 4 (Closest selection): ${poi.validation.rule4_isClosestToInducement ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('❌ Failed to find valid POI for Test 1!');
  }
  console.log('\n------------------------------------------------\n');


  // --- CASE STUDY 2 ---
  const cs2 = getTest2GBPJPY15MData();
  const obs2 = detectOrderBlocks(cs2.candles, cs2.structure);
  const pois2 = detectSLPPOIs(cs2.candles, cs2.structure, obs2, cs2.inducements);

  console.log('--- TEST 2: GBP/JPY 15M Plain BOS Case Study ---');
  console.log(`Order Blocks Found: ${obs2.length}`);
  console.log(`Total POIs Evaluated: ${pois2.length}`);
  if (pois2.length > 0) {
    const poi = pois2[0];
    console.log(`✓ POI ID: ${poi.id}`);
    console.log(`✓ Type: ${poi.type}`);
    console.log(`✓ Direction: ${poi.direction}`);
    console.log(`✓ Rule 1 Trigger Flagged: ${poi.validation.rule1_validTrigger ? 'PASS (PROVISIONAL)' : 'FAIL'} (${poi.validation.rule1_note})`);
  } else {
    console.log('❌ Failed to find any POIs for Test 2!');
  }
  console.log('\n------------------------------------------------\n');


  // --- CASE STUDY 3 ---
  const cs3 = getTest3GBPJPY30MData();
  const obs3 = detectOrderBlocks(cs3.candles, cs3.structure);
  const pois3 = detectSLPPOIs(cs3.candles, cs3.structure, obs3, cs3.inducements);

  console.log('--- TEST 3: GBP/JPY 30M Breaker Block Case Study ---');
  console.log(`Order Blocks Found: ${obs3.length}`);
  console.log(`Total POIs Evaluated: ${pois3.length}`);
  const breakers = pois3.filter(p => p.type === 'BREAKER_BLOCK');
  console.log(`Breaker Blocks Found: ${breakers.length}`);
  if (breakers.length > 0) {
    const breaker = breakers[0];
    console.log(`✓ Breaker ID: ${breaker.id}`);
    console.log(`✓ Direction Flipped: ${breaker.direction} (Expected: BULLISH - opposite of bearish OB origin)`);
    console.log(`✓ Breaker Flip Time: ${breaker.breakerFlipTime} (Index 40)`);
    console.log(`✓ Rule 3 (Unmitigated check starts from breakerFlipTime): ${breaker.validation.rule3_unmitigated ? 'PASS' : 'FAIL'} (${breaker.validation.rule3_violationDetail || 'No mitigation found'})`);
  } else {
    console.log('❌ Failed to find Breaker Block for Test 3!');
  }
  console.log('\n------------------------------------------------\n');


  // --- CASE STUDY 4 ---
  const cs4 = getTest4CompetitiveData();
  const trigger4 = { kind: 'MSS' as const, event: cs4.structure.mssEvents[0] };
  const obs4: OrderBlockCandidate[] = [
    {
      id: 'ob-comp-1',
      direction: 'BULLISH',
      obCandle: cs4.candles[15],
      obCandleIndex: 15,
      engulfingCandle: cs4.candles[16],
      engulfingCandleIndex: 16,
      zoneTop: 107.00,
      zoneBottom: 106.00,
      entryLevel: 105.90,
      stopLossLevel: 105.80,
      originTrigger: trigger4,
      time: cs4.candles[15].time,
      displayLabel: 'Lower Bullish OB (further)'
    },
    {
      id: 'ob-comp-2',
      direction: 'BULLISH',
      obCandle: cs4.candles[30],
      obCandleIndex: 30,
      engulfingCandle: cs4.candles[31],
      engulfingCandleIndex: 31,
      zoneTop: 114.00,
      zoneBottom: 113.00,
      entryLevel: 112.90,
      stopLossLevel: 112.80,
      originTrigger: trigger4,
      time: cs4.candles[30].time,
      displayLabel: 'Higher Bullish OB (closer)'
    }
  ];
  const pois4 = detectSLPPOIs(cs4.candles, cs4.structure, obs4, cs4.inducements);

  console.log('--- TEST 4: Rule 4 Competitive Selection Case Study ---');
  console.log(`Order Blocks Seeded: ${obs4.length}`);
  console.log(`Total POIs Evaluated: ${pois4.length}`);
  pois4.forEach((poi) => {
    console.log(`  - POI ID: ${poi.id} | Zone: ${poi.zoneBottom} - ${poi.zoneTop} | Rule 4 Pass: ${poi.validation.rule4_isClosestToInducement ? 'TRUE' : 'FALSE'}`);
    if (!poi.validation.rule4_isClosestToInducement) {
      console.log(`    ↳ Failed rule list: ${JSON.stringify(poi.validation.failedRules)}`);
    }
  });
  console.log('\n============================================================================');
  console.log('                      FULL POI OBJECTS JSON REPORT');
  console.log('============================================================================');
  
  const allTestPOIs = [...pois1, ...pois2, ...pois3, ...pois4];
  console.log(JSON.stringify(allTestPOIs, null, 2));
  console.log('============================================================================');
}

runAllPOITests();
