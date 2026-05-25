import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server';

describe('POI Routes Integration Tests', () => {
  let app: any;
  let token: string;

  beforeAll(async () => {
    app = await createServer();
    token = app.jwt.sign({ sub: 'user-1' });
  });

  it('GET /pois requires auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pois',
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /pois creates POI for authenticated user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pois',
      headers: { Authorization: `Bearer ${token}` },
      payload: { id: 'test-poi-123', pair: 'BTCUSDT', timeframe: '1D', type: 'ORDER_BLOCK', priceFrom: 500, priceTo: 550 },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe('test-poi-123');
    expect(body.priceFrom).toBe(500);
  });

  it('GET /pois returns only user POIs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pois',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('PATCH /pois/:id updates status', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/pois/test-poi-123',
      headers: { Authorization: `Bearer ${token}` },
      payload: { status: 'MITIGATED' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('MITIGATED');
  });

  it('Cannot delete another user\'s POI -> 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/pois/other-user-poi',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /pois/:id removes POI', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/pois/test-poi-123',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });
});
