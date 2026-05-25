import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth API Mocks
  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.email === 'exists@autoslp.com') {
      return HttpResponse.json({ error: 'Email exists' }, { status: 409 });
    }
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { id: 'user-1', name: body.name, email: body.email },
    }, { status: 201 });
  }),

  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'Wrong password' }, { status: 401 });
    }
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: { id: 'user-1', name: 'Marcus Vance', email: body.email },
    }, { status: 200 });
  }),

  http.get('*/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      id: 'user-1',
      name: 'Marcus Vance',
      email: 'marcus@autoslp.com',
    }, { status: 200 });
  }),

  // POI API Mocks
  http.get('*/pois', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json([
      { id: 'poi-1', name: 'Daily OB', type: 'OB', priceRange: '$100-$110', status: 'Active', timeframe: '1D' },
    ], { status: 200 });
  }),

  http.post('*/pois', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as any;
    return HttpResponse.json({ id: 'new-poi', ...body }, { status: 201 });
  }),

  http.patch('*/pois/:id', async ({ request, params }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ id: params.id, ...body }, { status: 200 });
  }),

  http.delete('*/pois/:id', ({ params }) => {
    if (params.id === 'other-user-poi') {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // Market API Mocks
  http.get('*/market/candles', ({ request }) => {
    const url = new URL(request.url);
    const start = url.searchParams.get('start');
    if (start && Number(start) > Date.now()) {
      return HttpResponse.json([], { status: 200 });
    }
    return HttpResponse.json([
      { time: '2025-05-24', open: 60000, high: 61000, low: 59000, close: 60500, volume: 100 },
    ], { status: 200 });
  }),

  http.get('*/market/bias', () => {
    return HttpResponse.json({ bias: 'BULLISH', strength: 'STRONG' }, { status: 200 });
  }),
];
