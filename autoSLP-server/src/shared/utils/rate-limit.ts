import { redisClient } from './cache.js';

/**
 * Custom Rate Limiter using Redis/MockRedisCache.
 * Throws an error if the user/IP has exceeded their quota.
 */
export async function limitRate(
  keyPrefix: string,
  identifier: string,
  limit: number,
  windowSecs: number = 60
): Promise<void> {
  const key = `rate:${keyPrefix}:${identifier}`;
  const current = await redisClient.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limit) {
    const err = new Error(`RATE_LIMIT_EXCEEDED: Too many requests. Limit is ${limit} per ${windowSecs} seconds.`);
    (err as any).statusCode = 429;
    throw err;
  }

  if (count === 0) {
    await redisClient.set(key, '1', 'EX', windowSecs);
  } else {
    // Increment and refresh the rate lock TTL safely
    await redisClient.set(key, (count + 1).toString(), 'EX', windowSecs);
  }
}
