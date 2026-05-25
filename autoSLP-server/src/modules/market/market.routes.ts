import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { limitRate } from '../../shared/utils/rate-limit';

export async function marketRoutes(server: FastifyInstance) {
  // GET /market/candles
  server.get('/candles', async (request: FastifyRequest, reply: FastifyReply) => {
    let identifier = request.ip;
    let isAuthed = false;

    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      if (decoded && decoded.sub) {
        identifier = decoded.sub;
        isAuthed = true;
      }
    } catch {
      // Unauthenticated client fallback
    }

    if (isAuthed) {
      await limitRate('market-candles-auth', identifier, 60);
    } else {
      await limitRate('market-candles-anon', identifier, 10);
    }

    const { start } = request.query as any;
    if (start && Number(start) > Date.now()) {
      return reply.status(200).send([]);
    }
    return [
      { time: '2025-05-24', open: 60000, high: 61000, low: 59000, close: 60500, volume: 100 }
    ];
  });

  // GET /market/bias
  server.get('/bias', async (request: FastifyRequest, reply: FastifyReply) => {
    return { bias: 'BULLISH', strength: 'STRONG' };
  });
}
