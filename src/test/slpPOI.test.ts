import { describe, it, expect } from 'vitest';
import { detectSLPPOIs } from '../lib/slp/slpPOI';
import { Candle } from '../lib/market/marketDataService';
import { SLPStructureResult } from '../lib/slp/slpMarketStructure';
import { OrderBlockCandidate } from '../lib/slp/slpOrderBlock';
import { InducementPoint } from '../lib/slp/slpInducement';

describe('SLP POI Detection and 4-Rule Validation', () => {
  it('correctly returns POIs when detected', () => {
    const candles: Candle[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 1001, open: 102, high: 104, low: 101, close: 101, volume: 1000 },
      { time: 1002, open: 102, high: 115, low: 102, close: 114, volume: 2000 },
    ];

    const structure: SLPStructureResult = {
      timeframe: '15m' as any,
      currentTrend: 'UPTREND',
      swingHighs: [],
      swingLows: [],
      mssEvents: [
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
      ],
      bosEvents: [],
      doubleBOSEvents: [],
      analysedAt: 1002,
    };

    const trigger = {
      kind: 'MSS' as const,
      event: structure.mssEvents[0],
    };

    const orderBlocks: OrderBlockCandidate[] = [
      {
        id: 'ob-1',
        direction: 'BULLISH',
        obCandle: candles[1],
        obCandleIndex: 1,
        engulfingCandle: candles[2],
        engulfingCandleIndex: 2,
        zoneTop: 102,
        zoneBottom: 101,
        entryLevel: 101.5,
        stopLossLevel: 101,
        originTrigger: trigger,
        time: 1001,
        displayLabel: 'Bullish OB',
      }
    ];

    const inducements: InducementPoint[] = [
      {
        id: 'idm-1',
        time: 1001,
        price: 105,
        swingType: 'HIGH',
        direction: 'BULLISH',
        candleIndex: 1,
        originTrigger: trigger,
        originConfidence: 'STANDARD',
        status: 'SWEPT',
        sweptAt: 1002,
        sweptCandleIndex: 2,
        invalidatedAt: null,
      }
    ];

    const pois = detectSLPPOIs(candles, structure, orderBlocks, inducements);

    expect(pois.length).toBeGreaterThanOrEqual(1);
    expect(pois[0].type).toBe('ORDER_BLOCK');
    expect(pois[0].direction).toBe('BULLISH');
    expect(pois[0].zoneTop).toBe(102);
    expect(pois[0].zoneBottom).toBe(101);
    expect(pois[0].entryLevel).toBe(101.5);
  });
});
