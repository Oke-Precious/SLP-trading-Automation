import { FastifyInstance } from 'fastify';
import { marketController } from './market.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function marketRoutes(fastify: FastifyInstance) {
  // ── PUBLIC ROUTES (no auth needed for market data) ────────────────────
  fastify.get('/pairs', {
    schema: {
      tags: ['Market'],
      summary: 'Get all supported trading pairs',
    }
  }, marketController.getPairs);

  fastify.get('/candles', {
    schema: {
      tags: ['Market'],
      summary: 'Get OHLCV candles for a pair',
      querystring: {
        type: 'object',
        required: ['pair', 'timeframe'],
        properties: {
          pair:      { type: 'string', example: 'BTCUSDT' },
          timeframe: { type: 'string', example: '1D' },
          limit:     { type: 'number', default: 500 },
          from:      { type: 'string', format: 'date-time' },
          to:        { type: 'string', format: 'date-time' },
        }
      }
    }
  }, marketController.getCandles);

  fastify.get('/ticker', {
    schema: {
      tags: ['Market'],
      querystring: {
        type: 'object',
        required: ['pair'],
        properties: { pair: { type: 'string' } }
      }
    }
  }, marketController.getTicker);

  fastify.get('/tickers', {
    schema: { tags: ['Market'], summary: 'Get tickers for all pairs' }
  }, marketController.getAllTickers);

  // ── AUTHENTICATED ROUTES ───────────────────────────────────────────────
  fastify.get('/bias', {
    preHandler: [authenticate],
    schema: {
      tags: ['Market'],
      querystring: {
        type: 'object',
        required: ['pair', 'timeframe'],
        properties: {
          pair:      { type: 'string' },
          timeframe: { type: 'string' },
        }
      }
    }
  }, marketController.getBias);

  fastify.get('/bias/all', {
    preHandler: [authenticate],
    schema: { tags: ['Market'], summary: 'Get bias for all pairs and timeframes' }
  }, marketController.getAllBias);
}
