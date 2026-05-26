import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { config } from '../../config.js';

// High-speed token storage backend (in-memory lock cache fallback in case Redis setup is pending)
export class MockRedisCache {
  private store = new Map<string, { value: string; expiry: number }>();

  async set(key: string, value: string, mode?: string, duration?: number) {
    const expiry = duration ? Date.now() + duration * 1000 : Infinity;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string) {
    this.store.delete(key);
    return 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const results: string[] = [];
    const regexStr = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        const entry = this.store.get(key);
        if (entry && Date.now() <= entry.expiry) {
          results.push(key);
        }
      }
    }
    return results;
  }
}

// Resilient singleton accessor for cache backend
export let redisClient: any;

// Detect Vitest test running environment to completely decouple connection tests
const isTesting = process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.VITEST_WORKER_ID;

if (isTesting) {
  redisClient = new MockRedisCache();
} else {
  try {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 0,
      connectTimeout: 500,
      lazyConnect: true
    });
    redisClient.on('error', () => {
      logger.warn('Redis unreachable. Transitioning auth sessions to safety fallback engine.');
      redisClient = new MockRedisCache();
    });
  } catch {
    redisClient = new MockRedisCache();
  }
}
