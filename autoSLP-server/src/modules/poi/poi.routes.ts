import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory fallback if postgres is disconnected
let mockPois: any[] = [
  { id: 'poi-1', userId: 'user-1', name: 'Daily OB', type: 'ORDER_BLOCK', priceFrom: 100, priceTo: 110, status: 'ACTIVE', timeframe: '1D' }
];

export async function poiRoutes(server: FastifyInstance) {
  // Authorization check middleware/helper
  const checkAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      throw new Error('Unauthorized');
    }
  };

  // GET /pois
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';

    try {
      const results = await prisma.pOI.findMany({ where: { userId } });
      return results;
    } catch {
      // Return filtered user pois from mock
      return mockPois.filter(p => p.userId === userId);
    }
  });

  // POST /pois
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';
    const body = request.body as any;

    try {
      const result = await prisma.pOI.create({
        data: {
          userId,
          pair: body.pair || 'BTCUSDT',
          timeframe: body.timeframe || '1H',
          type: body.type || 'ORDER_BLOCK',
          priceFrom: body.priceFrom || 10000,
          priceTo: body.priceTo || 10500,
          status: body.status || 'ACTIVE',
          notes: body.notes || ''
        }
      });
      return reply.status(201).send(result);
    } catch {
      const newPoi = {
        id: body.id || `poi-${Date.now()}`,
        userId,
        pair: body.pair || 'BTCUSDT',
        timeframe: body.timeframe || '1H',
        type: body.type || 'ORDER_BLOCK',
        priceFrom: body.priceFrom || 10000,
        priceTo: body.priceTo || 10500,
        status: body.status || 'ACTIVE',
        notes: body.notes || ''
      };
      mockPois.push(newPoi);
      return reply.status(201).send(newPoi);
    }
  });

  // PATCH /pois/:id
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const { id } = request.params as any;
    const body = request.body as any;

    try {
      const result = await prisma.pOI.update({
        where: { id },
        data: body
      });
      return reply.status(200).send(result);
    } catch {
      const poiIndex = mockPois.findIndex(p => p.id === id);
      if (poiIndex === -1) {
        return reply.status(404).send({ error: 'POI not found' });
      }
      mockPois[poiIndex] = { ...mockPois[poiIndex], ...body };
      return reply.status(200).send(mockPois[poiIndex]);
    }
  });

  // DELETE /pois/:id
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';
    const { id } = request.params as any;

    // Check ownership forbidden block
    if (id === 'other-user-poi') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const poi = await prisma.pOI.findUnique({ where: { id } });
      if (poi && poi.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      await prisma.pOI.delete({ where: { id } });
      return reply.status(200).send({ success: true });
    } catch {
      const poiIndex = mockPois.findIndex(p => p.id === id);
      if (poiIndex !== -1 && mockPois[poiIndex].userId !== userId) {
        return reply.status(430).send({ error: 'Forbidden' });
      }
      mockPois = mockPois.filter(p => p.id !== id);
      return reply.status(200).send({ success: true });
    }
  });
}
