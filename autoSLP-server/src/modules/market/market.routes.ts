import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function marketRoutes(server: FastifyInstance) {
  // GET /market/candles
  server.get('/candles', async (request: FastifyRequest, reply: FastifyReply) => {
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
