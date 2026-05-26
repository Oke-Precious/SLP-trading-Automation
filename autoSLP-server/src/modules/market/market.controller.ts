import { FastifyRequest, FastifyReply } from 'fastify';
import { marketService } from './market.service.js';

export const marketController = {
  async getPairs(req: FastifyRequest, reply: FastifyReply) {
    const pairs = await marketService.getSupportedPairs();
    return reply.send({ success: true, data: pairs });
  },

  async getCandles(req: FastifyRequest<{
    Querystring: { pair: string; timeframe: string; limit?: number; from?: string; to?: string }
  }>, reply: FastifyReply) {
    const { pair, timeframe, limit = 500, from, to } = req.query as any;
    const candles = await marketService.getCandles(pair, timeframe, limit, from, to);
    return reply.send({ success: true, data: candles });
  },

  async getTicker(req: FastifyRequest<{
    Querystring: { pair: string }
  }>, reply: FastifyReply) {
    const { pair } = req.query as any;
    const ticker = await marketService.getTicker(pair);
    return reply.send({ success: true, data: ticker });
  },

  async getAllTickers(req: FastifyRequest, reply: FastifyReply) {
    const tickers = await marketService.getAllTickers();
    return reply.send({ success: true, data: tickers });
  },

  async getBias(req: FastifyRequest<{
    Querystring: { pair: string; timeframe: string }
  }>, reply: FastifyReply) {
    const { pair, timeframe } = req.query as any;
    const bias = await marketService.getBias(pair, timeframe);
    return reply.send({ success: true, data: bias });
  },

  async getAllBias(req: FastifyRequest, reply: FastifyReply) {
    const biasMap = await marketService.getAllBias();
    return reply.send({ success: true, data: biasMap });
  },
};
