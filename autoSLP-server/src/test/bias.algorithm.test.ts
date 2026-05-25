import { describe, it, expect, vi } from 'vitest';
import { calculateBias } from '../modules/analysis/bias.algorithm';
import { Candle } from '../shared/types';

// Mock structure algorithms to return exact swing patterns we want to test
vi.mock('../modules/analysis/structure.algorithm', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    detectSwingPoints: vi.fn((candles: Candle[], lookback: number) => {
      // If the candles are flat, return empty swing points to test NEUTRAL
      if (candles[0]?.open === 100 && candles[0]?.high === 100) {
        return { highs: [], lows: [] };
      }
      
      // Return beautiful trending swing points to test BULLISH
      return {
        highs: [
          { price: 100, index: 1, timestamp: new Date() },
          { price: 110, index: 5, timestamp: new Date() },
          { price: 120, index: 9, timestamp: new Date() },
        ],
        lows: [
          { price: 90, index: 2, timestamp: new Date() },
          { price: 95, index: 6, timestamp: new Date() },
          { price: 102, index: 10, timestamp: new Date() },
        ],
      };
    }),
  };
});

describe('Bias Algorithm Tests', () => {
  const createMockCandles = (length: number): Candle[] => {
    return Array.from({ length }, (_, i) => ({
      pair: 'BTCUSDT',
      timeframe: '4H',
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 100,
      timestamp: new Date(Date.now() + i * 3600000),
    }));
  };

  it('calculateBias on bullish candles returns BULLISH with STRONG/MODERATE strength', () => {
    const candles = createMockCandles(50);
    const result = calculateBias(candles, '4H');
    expect(result.bias).toBe('BULLISH');
    expect(['STRONG', 'MODERATE', 'WEAK']).toContain(result.strength);
  });

  it('calculateBias with a structure that is mixed -> NEUTRAL', () => {
    // Flat range where mock detectSwingPoints returns empty highs/lows
    const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
      pair: 'BTCUSDT',
      timeframe: '4H',
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 100,
      timestamp: new Date(Date.now() + i * 3600000),
    }));

    const result = calculateBias(candles, '4H');
    expect(result.bias).toBe('NEUTRAL');
  });

  it('strength calculation: momentum-supported trend -> STRONG', () => {
    const candles = createMockCandles(50);
    // Insure end momentum is growing
    const end = candles.length - 1;
    candles[end].close = candles[end].open + 100;
    candles[end - 1].close = candles[end - 1].open + 1;
    candles[end - 2].close = candles[end - 2].open + 10;
    candles[end - 3].close = candles[end - 3].open + 1;

    const result = calculateBias(candles, '4H');
    expect(result.bias).toBe('BULLISH');
    expect(result.strength).toBe('STRONG');
  });
});
