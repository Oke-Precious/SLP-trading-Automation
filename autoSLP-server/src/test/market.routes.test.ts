import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server.js';

describe('Market Routes Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await createServer();
  });

  it('GET /market/candles returns OHLCV array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/market/candles',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].time).toBe('2025-05-24');
    expect(body[0].open).toBe(60000);
  });

  it('GET /market/candles with future timestamps -> empty array', async () => {
    const futureTime = Date.now() + 100000000;
    const res = await app.inject({
      method: 'GET',
      url: `/market/candles?start=${futureTime}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toEqual([]);
  });

  it('GET /market/bias returns bias object', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/market/bias',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toEqual({ bias: 'BULLISH', strength: 'STRONG' });
  });
});
