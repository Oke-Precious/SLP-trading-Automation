import { describe, it, expect } from 'vitest';
import { detectSLPPOIs } from '../lib/slp/slpPOI';
import { Candle } from '../lib/market/marketDataService';
import { LiquidityLevel } from '../lib/slp/slpLiquidity';
import { MSSEvent, BOSEvent } from '../lib/slp/slpStructure';

describe('SLP POI Detection and 4-Rule Validation', () => {
  it('correctly returns valid POIs when all 4 rules pass', () => {
    const candles: Candle[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 1001, open: 102, high: 104, low: 101, close: 101, volume: 1000 }, // Bearish candle (OB body is 101-102, mid 101.5)
      { time: 1002, open: 102, high: 115, low: 102, close: 114, volume: 2000 }, // Bullish impulse (low 102 stays above 101.5 OB mid)
      { time: 1003, open: 114, high: 116, low: 113, close: 115, volume: 1000 }, // Next candle (low 113 stays above 101.5)
    ];

    const mssEvents: MSSEvent[] = [
      {
        time: 1002,
        direction: 'BULLISH',
        price: 114,
        swingBroken: {
          type: 'LOW',
          price: 98,
          time: 1000,
          index: 0,
          confirmed: true,
        },
        candleIndex: 2,
      }
    ];

    const bosEvents: BOSEvent[] = [];

    const liquidityLevels: LiquidityLevel[] = [
      {
        id: 'eql-1',
        type: 'EQUAL_LOWS',
        price: 90,
        priceRange: [89.9, 90.1],
        time: 990,
        swept: false,
        sweptTime: null,
        touchCount: 2,
        side: 'SELL_SIDE', // Liquidity BELOW the POI (body low of bearish candle is 101)
      },
      {
        id: 'eqh-1',
        type: 'EQUAL_HIGHS',
        price: 120,
        priceRange: [119.9, 120.1],
        time: 992,
        swept: true,
        sweptTime: 1003,
        touchCount: 2,
        side: 'BUY_SIDE',
      }
    ];

    const pois = detectSLPPOIs(candles, mssEvents, bosEvents, liquidityLevels);

    // Should return the Order Block because:
    // Rule 1: Triggered MSS (passed)
    // Rule 2: Protected by liquidity below 101 (EQL is at 90, unswept) (passed)
    // Rule 3: Unmitigated (price has remained above 50% midpoint 101.5 since) (passed)
    // Rule 4: Closest valid POI to swept liquidity (eqh-1 at 120 was swept) (passed)
    expect(pois.length).toBeGreaterThanOrEqual(1);
    expect(pois[0].type).toBe('ORDER_BLOCK');
    expect(pois[0].direction).toBe('BULLISH');
    expect(pois[0].priceTop).toBe(102);
    expect(pois[0].priceBottom).toBe(101);
    expect(pois[0].priceMid).toBe(101.5);
  });
});
