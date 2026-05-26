import { describe, it, expect } from 'vitest';
import { detectSwingPoints, classifyStructure } from '../modules/analysis/structure.algorithm.js';
import { Candle, PivotPoint } from '../shared/types/index.js';

describe('Structure Algorithm Tests', () => {
  it('detectSwingPoints with 20-bar flat data -> no swing points', () => {
    // Generate 20 flat candles
    const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      pair: 'BTCUSDT',
      timeframe: '4H',
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 100,
      timestamp: new Date(Date.now() + i * 1000),
    }));

    const { highs, lows } = detectSwingPoints(candles, 3);
    expect(highs.length).toBe(0);
    expect(lows.length).toBe(0);
  });

  it('detectSwingPoints with clear peak at index 10 -> detects it', () => {
    // Generate 20 flat candles with high peak at index 10
    const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      pair: 'BTCUSDT',
      timeframe: '4H',
      open: 100,
      high: i === 10 ? 200 : 100,
      low: i === 10 ? 95 : 100,
      close: 100,
      volume: 100,
      timestamp: new Date(Date.now() + i * 1000),
    }));

    const { highs } = detectSwingPoints(candles, 3);
    expect(highs.some((h: any) => h.index === 10 && h.price === 200)).toBe(true);
  });

  it('classifyStructure with HH+HL sequence -> BULLISH', () => {
    // Higher Highs: 100, 110, 120
    const highs: PivotPoint[] = [
      { price: 100, index: 1, timestamp: new Date() },
      { price: 110, index: 4, timestamp: new Date() },
      { price: 120, index: 7, timestamp: new Date() },
    ];
    // Higher Lows: 90, 95, 102
    const lows: PivotPoint[] = [
      { price: 90, index: 2, timestamp: new Date() },
      { price: 95, index: 5, timestamp: new Date() },
      { price: 102, index: 8, timestamp: new Date() },
    ];

    expect(classifyStructure(highs, lows)).toBe('BULLISH');
  });

  it('classifyStructure with LH+LL sequence -> BEARISH', () => {
    // Lower Highs: 120, 110, 100
    const highs: PivotPoint[] = [
      { price: 120, index: 1, timestamp: new Date() },
      { price: 110, index: 4, timestamp: new Date() },
      { price: 100, index: 7, timestamp: new Date() },
    ];
    // Lower Lows: 102, 95, 90
    const lows: PivotPoint[] = [
      { price: 102, index: 2, timestamp: new Date() },
      { price: 95, index: 5, timestamp: new Date() },
      { price: 90, index: 8, timestamp: new Date() },
    ];

    expect(classifyStructure(highs, lows)).toBe('BEARISH');
  });

  it('classifyStructure with mixed -> NEUTRAL', () => {
    // Mixed Highs and Lows
    const highs: PivotPoint[] = [
      { price: 100, index: 1, timestamp: new Date() },
      { price: 95, index: 4, timestamp: new Date() },
      { price: 120, index: 7, timestamp: new Date() },
    ];
    const lows: PivotPoint[] = [
      { price: 90, index: 2, timestamp: new Date() },
      { price: 85, index: 5, timestamp: new Date() },
      { price: 100, index: 8, timestamp: new Date() },
    ];

    expect(classifyStructure(highs, lows)).toBe('NEUTRAL');
  });
});
