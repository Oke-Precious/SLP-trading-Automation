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

  async getBias(req: FastifyRequest<any>, reply: FastifyReply) {
    const { pair, timeframe } = req.query as any;
    const bias = await marketService.getBias(pair, timeframe);
    return reply.send({ success: true, data: bias });
  },

  async getAllBias(req: FastifyRequest, reply: FastifyReply) {
    const biasMap = await marketService.getAllBias();
    return reply.send({ success: true, data: biasMap });
  },

  async validateKey(req: FastifyRequest<{
    Querystring: { apikey: string }
  }>, reply: FastifyReply) {
    const { apikey } = req.query as any;
    if (!apikey) {
      return reply.status(400).send({ success: false, error: 'API key is required' });
    }

    const errors: string[] = [];
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'apikey': apikey,
      'Authorization': `apikey ${apikey}`
    };

    // Attempt 1: Standard /api_usage endpoint
    try {
      const response = await fetch(`https://api.twelvedata.com/api_usage?apikey=${apikey}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status !== 'error' && !data.error) {
          return reply.send({ success: true, method: 'api_usage', data });
        } else {
          errors.push(data.message || data.error || 'api_usage endpoint returned error status');
        }
      } else {
        errors.push(`api_usage status ${response.status}`);
      }
    } catch (err: any) {
      errors.push(`api_usage exception: ${err.message || err}`);
    }

    // Attempt 2: Live Price check for major asset (EUR/USD), most reliable for free keys
    try {
      const response = await fetch(`https://api.twelvedata.com/price?symbol=EUR/USD&apikey=${apikey}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.price) {
          return reply.send({ success: true, method: 'price_check', data });
        } else if (data && (data.status === 'error' || data.error)) {
          errors.push(data.message || data.error || 'price endpoint returned error status');
        }
      } else {
        errors.push(`price check status ${response.status}`);
      }
    } catch (err: any) {
      errors.push(`price check exception: ${err.message || err}`);
    }

    // Attempt 3: Legacy utils/api_usage endpoint
    try {
      const response = await fetch(`https://api.twelvedata.com/utils/api_usage?apikey=${apikey}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status !== 'error' && !data.error) {
          return reply.send({ success: true, method: 'utils_api_usage', data });
        } else {
          errors.push(data.message || data.error || 'utils/api_usage endpoint returned error status');
        }
      } else {
        errors.push(`utils/api_usage status ${response.status}`);
      }
    } catch (err: any) {
      errors.push(`utils/api_usage exception: ${err.message || err}`);
    }

    // Attempt 4: Alternative live price check with AAPL (US Stock)
    try {
      const response = await fetch(`https://api.twelvedata.com/price?symbol=AAPL&apikey=${apikey}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.price) {
          return reply.send({ success: true, method: 'price_check_stock', data });
        }
      }
    } catch (err: any) {}

    // If all validation pathways failed, report the detailed errors
    const uniqueErrors = Array.from(new Set(errors));
    return reply.status(400).send({
      success: false,
      error: uniqueErrors.length > 0 ? uniqueErrors.join(' | ') : 'Twelve Data API token declined by servers'
    });
  },
};
