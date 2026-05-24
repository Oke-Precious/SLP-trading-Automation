import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Plan } from '@prisma/client';
import { config } from '../../config';
import Redis from 'ioredis';
import { logger } from '../../shared/utils/logger';

const prisma = new PrismaClient();

// High-speed token storage backend (in-memory lock cache fallback in case Redis setup is pending)
class MockRedisCache {
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
}

// Resilient singleton accessor for cache backend
let redisClient: Redis | MockRedisCache;
try {
  redisClient = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
  redisClient.on('error', () => {
    logger.warn('Redis unreachable. Transitioning auth sessions to safety fallback engine.');
    redisClient = new MockRedisCache();
  });
} catch {
  redisClient = new MockRedisCache();
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  username: string;
  plan: Plan;
  preferences: any;
  createdAt: Date;
}

export function generateTokenPair(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    config.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

export class AuthService {
  async register(email: string, username: string, password: string): Promise<{ user: UserWithoutPassword; accessToken: string; refreshToken: string }> {
    // 1. Password Rules validation
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('VALIDATION_001: Password must have at least 8 characters, 1 number, and 1 special symbol.');
    }

    // 2. Uniqueness checklist
    const duplicateEmail = await prisma.user.findFirst({ where: { email } });
    if (duplicateEmail) {
      throw new Error('AUTH_004: Email already registered in system.');
    }

    const duplicateUser = await prisma.user.findFirst({ where: { username } });
    if (duplicateUser) {
      throw new Error('AUTH_005: Username already active.');
    }

    // 3. Encrypt & Vault credentials
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        preferences: {
          defaultPair: 'BTCUSDT',
          defaultTF: '1H',
          theme: 'dark'
        }
      }
    });

    // 4. Issue and register sessions
    const tokens = generateTokenPair(user.id);
    await redisClient.set(`refresh:${user.id}:${tokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

    const { passwordHash: _, ...userContext } = user;
    return { user: userContext, ...tokens };
  }

  async login(email: string, password: string): Promise<{ user: UserWithoutPassword; accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new Error('AUTH_001: Invalid login email or password parameters.');
    }

    const verify = await bcrypt.compare(password, user.passwordHash);
    if (!verify) {
      throw new Error('AUTH_001: Invalid credentials.');
    }

    const tokens = generateTokenPair(user.id);
    await redisClient.set(`refresh:${user.id}:${tokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

    const { passwordHash: _, ...userContext } = user;
    return { user: userContext, ...tokens };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { sub: string; type: string };
      if (decoded.type !== 'refresh') {
        throw new Error('AUTH_003: Invalid execution headers.');
      }

      // Query active lock hashes inside our session cache store
      const status = await redisClient.get(`refresh:${decoded.sub}:${refreshToken}`);
      if (!status) {
        throw new Error('AUTH_002: Token session terminated or expired.');
      }

      // Rotate lock parameters
      await redisClient.del(`refresh:${decoded.sub}:${refreshToken}`);
      const newTokens = generateTokenPair(decoded.sub);
      await redisClient.set(`refresh:${decoded.sub}:${newTokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

      return newTokens;
    } catch (e: any) {
      throw new Error(e.message || 'AUTH_002: Token parse error.');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.decode(refreshToken) as { sub: string } | null;
      if (decoded && decoded.sub) {
        await redisClient.del(`refresh:${decoded.sub}:${refreshToken}`);
      }
    } catch {
      // Graceful termination loss
    }
  }
}
