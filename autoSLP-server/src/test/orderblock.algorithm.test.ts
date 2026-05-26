import { describe, it, expect } from 'vitest';
import { detectOrderBlocks, detectBreakerBlocks } from '../modules/analysis/orderblock.algorithm.js';
import { Candle, POIZone } from '../shared/types/index.js';

describe('Order Block Algorithm Tests', () => {
  const createMockCandlesForOB = (length: number): Candle[] => {
    const candles: Candle[] = [];
    const now = Date.now();
    let price = 10000;

    for (let i = 0; i < length; i++) {
      // Small fluctuating candles by default
      const change = i % 2 === 0 ? 10 : -10;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + 5;
      const low = Math.min(open, close) - 5;

      candles.push({
        pair: 'BTCUSDT',
        timeframe: '4H',
        open,
        high,
        low,
        close,
        volume: 100,
        timestamp: new Date(now + i * 3600000),
      });
      price = close;
    }
    return candles;
  };

  it('detectOrderBlocks on candles with known OB -> finds it at ±0.1% price levels', () => {
    const candles = createMockCandlesForOB(40);
    const obIndex = 25;

    // Create a precise candidate candle for Bullish Order Block (a Down/Bearish candle)
    candles[obIndex].open = 10000;
    candles[obIndex].close = 9950;
    candles[obIndex].low = 9930;
    candles[obIndex].high = 10010;

    // Create a following massive Up/Bullish candle (triggering expansion above ATR)
    candles[obIndex + 1].open = 9960;
    candles[obIndex + 1].close = 11000; // Giant surge
    candles[obIndex + 1].high = 11050;
    candles[obIndex + 1].low = 9950;

    const blocks = detectOrderBlocks(candles);
    expect(blocks.length).toBeGreaterThan(0);

    const bullishOB = blocks.find((b: any) => b.direction === 'BULLISH');
    expect(bullishOB).toBeDefined();

    // Verify correct price floor matches base candle low
    const expectedFloor = 9930;
    const diffPercent = Math.abs(bullishOB!.priceFloor - expectedFloor) / expectedFloor;
    expect(diffPercent).toBeLessThan(0.001); // Within ±0.1%
  });

  it('detectBreakerBlocks correctly identifies broken Bullish OBs', () => {
    const candles = createMockCandlesForOB(10);
    // Setup a bullish OB at price floor 10000
    const ob: POIZone = {
      type: 'ORDER_BLOCK',
      direction: 'BULLISH',
      priceFloor: 10000,
      priceCeiling: 10100,
      timestamp: new Date(),
      status: 'ACTIVE',
    };

    // Latest price closed below floor (9900 < 10000)
    candles[candles.length - 1].close = 9900;

    const mapped = detectBreakerBlocks(candles, [ob]);
    expect(mapped[0].type).toBe('BREAKER_BLOCK');
    expect(mapped[0].direction).toBe('BEARISH');
  });

  it('detectBreakerBlocks correctly identifies broken Bearish OBs', () => {
    const candles = createMockCandlesForOB(10);
    // Setup a bearish OB at ceiling 10000
    const ob: POIZone = {
      type: 'ORDER_BLOCK',
      direction: 'BEARISH',
      priceFloor: 9900,
      priceCeiling: 10000,
      timestamp: new Date(),
      status: 'ACTIVE',
    };

    // Latest price closed above ceiling (10100 > 10000)
    candles[candles.length - 1].close = 10100;

    const mapped = detectBreakerBlocks(candles, [ob]);
    expect(mapped[0].type).toBe('BREAKER_BLOCK');
    expect(mapped[0].direction).toBe('BULLISH');
  });
});
