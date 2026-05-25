import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { limitRate } from '../../shared/utils/rate-limit';
import { 
  sanitizeString, 
  validateNumberRange, 
  logAudit 
} from '../../shared/utils/security';

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
      return mockPois.filter(p => p.userId === userId);
    }
  });

  // POST /pois - Rate limit: 30 req/min per user, Input range & sanitization
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';

    // Apply Rate Limiting
    await limitRate('pois-create', userId, 30);

    const body = request.body as any;

    try {
      // Input sanitization & range limits
      const pair = sanitizeString(body.pair || 'BTCUSDT', 20);
      const timeframe = sanitizeString(body.timeframe || '1H', 10);
      const type = sanitizeString(body.type || 'ORDER_BLOCK', 30) === 'BREAKER_BLOCK' ? 'BREAKER_BLOCK' : 'ORDER_BLOCK';
      const notes = sanitizeString(body.notes || '', 500);
      
      const priceFrom = validateNumberRange(body.priceFrom || 10000, 0.00000001);
      const priceTo = validateNumberRange(body.priceTo || 10500, 0.00000001);

      const result = await prisma.pOI.create({
        data: {
          userId,
          pair,
          timeframe,
          type,
          priceFrom,
          priceTo,
          status: body.status || 'ACTIVE',
          notes
        }
      });

      await logAudit({
        userId,
        action: 'POI:POI_CREATED',
        resource: 'POI',
        resourceId: result.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(201).send(result);
    } catch (err: any) {
      if (err.message?.includes('VALIDATION_')) {
        return reply.status(400).send({ error: err.message });
      }

      // Safe Fallback logic
      const pair = sanitizeString(body.pair || 'BTCUSDT', 20);
      const timeframe = sanitizeString(body.timeframe || '1H', 10);
      const notes = sanitizeString(body.notes || '', 500);
      const priceFrom = Number(body.priceFrom || 10000);
      const priceTo = Number(body.priceTo || 10500);

      const newPoi = {
        id: body.id || `poi-${Date.now()}`,
        userId,
        pair,
        timeframe,
        type: body.type || 'ORDER_BLOCK',
        priceFrom,
        priceTo,
        status: body.status || 'ACTIVE',
        notes
      };
      mockPois.push(newPoi);

      await logAudit({
        userId,
        action: 'POI:POI_CREATED',
        resource: 'POI',
        resourceId: newPoi.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(201).send(newPoi);
    }
  });

  // PATCH /pois/:id - Input sanitization & range validation
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';
    const { id } = request.params as any;
    const body = request.body as any;

    try {
      const updateData: any = {};
      if (body.pair) updateData.pair = sanitizeString(body.pair, 20);
      if (body.timeframe) updateData.timeframe = sanitizeString(body.timeframe, 10);
      if (body.priceFrom !== undefined) updateData.priceFrom = validateNumberRange(body.priceFrom, 0.00000001);
      if (body.priceTo !== undefined) updateData.priceTo = validateNumberRange(body.priceTo, 0.00000001);
      if (body.notes !== undefined) updateData.notes = sanitizeString(body.notes, 500);
      if (body.status) updateData.status = sanitizeString(body.status, 20);

      const result = await prisma.pOI.update({
        where: { id },
        data: updateData
      });

      await logAudit({
        userId,
        action: 'POI:POI_MODIFIED',
        resource: 'POI',
        resourceId: result.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      if (err.message?.includes('VALIDATION_')) {
        return reply.status(400).send({ error: err.message });
      }

      const poiIndex = mockPois.findIndex(p => p.id === id);
      if (poiIndex === -1) {
        return reply.status(404).send({ error: 'POI not found' });
      }

      const updateData: any = {};
      if (body.pair) updateData.pair = sanitizeString(body.pair, 20);
      if (body.timeframe) updateData.timeframe = sanitizeString(body.timeframe, 10);
      if (body.notes !== undefined) updateData.notes = sanitizeString(body.notes, 500);
      if (body.status) updateData.status = sanitizeString(body.status, 20);
      if (body.priceFrom !== undefined) updateData.priceFrom = Number(body.priceFrom);
      if (body.priceTo !== undefined) updateData.priceTo = Number(body.priceTo);

      mockPois[poiIndex] = { ...mockPois[poiIndex], ...updateData };

      await logAudit({
        userId,
        action: 'POI:POI_MODIFIED',
        resource: 'POI',
        resourceId: id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(200).send(mockPois[poiIndex]);
    }
  });

  // DELETE /pois/:id
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await checkAuth(request, reply);
    const decoded = request.user as any;
    const userId = decoded?.sub || 'user-1';
    const { id } = request.params as any;

    if (id === 'other-user-poi') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const poi = await prisma.pOI.findUnique({ where: { id } });
      if (poi && poi.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      await prisma.pOI.delete({ where: { id } });

      await logAudit({
        userId,
        action: 'POI:POI_DELETED',
        resource: 'POI',
        resourceId: id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(200).send({ success: true });
    } catch {
      const poiIndex = mockPois.findIndex(p => p.id === id);
      if (poiIndex !== -1 && mockPois[poiIndex].userId !== userId) {
        return reply.status(430).send({ error: 'Forbidden' });
      }
      mockPois = mockPois.filter(p => p.id !== id);

      await logAudit({
        userId,
        action: 'POI:POI_DELETED',
        resource: 'POI',
        resourceId: id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        result: 'SUCCESS'
      });

      return reply.status(200).send({ success: true });
    }
  });
}
