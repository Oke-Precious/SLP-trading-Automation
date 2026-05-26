import { redisClient } from './utils/cache.js';

export const redis = new Proxy({} as any, {
  get(target, prop, receiver) {
    const activeClient = redisClient;
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(redisClient, prop, value, receiver);
  }
});
