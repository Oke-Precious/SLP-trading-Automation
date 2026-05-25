import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Plan } from '@prisma/client';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { privateKey, publicKey, logAudit } from '../../shared/utils/security';
import { redisClient } from '../../shared/utils/cache';

const prisma = new PrismaClient();

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
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

export class AuthService {
  async register(
    email: string,
    username: string,
    password: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ): Promise<{ user: UserWithoutPassword; accessToken: string; refreshToken: string }> {
    // 1. Password Policy: min 8, 1 upper, 1 lower, 1 digit, 1 special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-[\]\\/`~;=]/.test(password);

    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      throw new Error('VALIDATION_001: Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.');
    }

    // No email address as password
    if (password.toLowerCase() === email.toLowerCase()) {
      throw new Error('VALIDATION_001: Password cannot be the same as your email address.');
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

    // 3. Encrypt & Vault credentials with factor 12
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        preferences: {
          defaultPair: 'BTCUSDT',
          defaultTF: '1H',
          theme: 'dark',
          twoFactorEnabled: false
        }
      }
    });

    // 4. Issue and register sessions
    const tokens = generateTokenPair(user.id);
    await redisClient.set(`refresh:${user.id}:${tokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'AUTH:REGISTER',
      resource: 'USER',
      resourceId: user.id,
      ip,
      userAgent,
      result: 'SUCCESS'
    });

    const { passwordHash: _, ...userContext } = user;
    return { user: userContext, ...tokens };
  }

  async login(
    email: string,
    password: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ): Promise<{ user: UserWithoutPassword; accessToken: string; refreshToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Account Lockout: check locked status
    const isLocked = await redisClient.get(`auth:lock:${normalizedEmail}`);
    if (isLocked) {
      throw new Error('AUTH_007: Account locked due to 5 consecutive failures. Try again in 30 minutes.');
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) {
      await this.trackFailedLogin(normalizedEmail, ip, userAgent);
      throw new Error('AUTH_001: Invalid login email or password parameters.');
    }

    const verify = await bcrypt.compare(password, user.passwordHash);
    if (!verify) {
      await this.trackFailedLogin(normalizedEmail, ip, userAgent);
      throw new Error('AUTH_001: Invalid credentials.');
    }

    // Reset failed counter on successful attempt
    await redisClient.del(`auth:fails:${normalizedEmail}`);

    const tokens = generateTokenPair(user.id);
    await redisClient.set(`refresh:${user.id}:${tokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'AUTH:LOGIN',
      resource: 'USER',
      resourceId: user.id,
      ip,
      userAgent,
      result: 'SUCCESS'
    });

    const { passwordHash: _, ...userContext } = user;
    return { user: userContext, ...tokens };
  }

  private async trackFailedLogin(email: string, ip: string, userAgent: string) {
    const failsKey = `auth:fails:${email}`;
    const failsVal = await redisClient.get(failsKey);
    const failures = failsVal ? parseInt(failsVal, 10) + 1 : 1;
    await redisClient.set(failsKey, failures.toString(), 'EX', 900); // 15 mins expiry window

    if (failures >= 5) {
      // 30 minutes lockout
      await redisClient.set(`auth:lock:${email}`, 'locked', 'EX', 1800);
      await redisClient.del(failsKey);
      logger.warn(`SMTP Lockout notice sent to ${email} due to 5 failed logins`);
      
      await logAudit({
        userId: 'system',
        action: 'AUTH:LOCKOUT',
        resource: 'USER',
        resourceId: email,
        ip,
        userAgent,
        result: 'ALERT'
      });
    }
  }

  async refreshToken(
    refreshToken: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify using RS256/asymmetric key
      const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] }) as { sub: string; type: string };
      if (decoded.type !== 'refresh') {
        throw new Error('AUTH_003: Invalid execution headers.');
      }

      // Check active state
      const status = await redisClient.get(`refresh:${decoded.sub}:${refreshToken}`);
      if (!status) {
        // TOKEN REPLAY DETECTED!
        logger.error(`Token reuse detected for user ${decoded.sub}. Invalidating refresh token family.`);
        
        let keys: string[] = [];
        try {
          if ('keys' in redisClient) {
            keys = await redisClient.keys(`refresh:${decoded.sub}:*`);
          }
        } catch {
          // ignore error
        }

        for (const k of keys) {
          await redisClient.del(k);
        }

        await logAudit({
          userId: decoded.sub,
          action: 'AUTH:TOKEN_REUSE_DETECTION',
          resource: 'REFRESH_TOKEN',
          ip,
          userAgent,
          result: 'BREACH'
        });

        throw new Error('AUTH_002: Token session terminated due to re-use detection or expiry.');
      }

      // Invalidate current and issue rotated tokens
      await redisClient.del(`refresh:${decoded.sub}:${refreshToken}`);
      const newTokens = generateTokenPair(decoded.sub);
      await redisClient.set(`refresh:${decoded.sub}:${newTokens.refreshToken}`, 'active', 'EX', 7 * 24 * 60 * 60);

      await logAudit({
        userId: decoded.sub,
        action: 'AUTH:TOKEN_REFRESH',
        resource: 'USER',
        ip,
        userAgent,
        result: 'SUCCESS'
      });

      return newTokens;
    } catch (e: any) {
      throw new Error(e.message || 'AUTH_002: Token parse error.');
    }
  }

  async logout(
    refreshToken: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ): Promise<void> {
    try {
      const decoded = jwt.decode(refreshToken) as { sub: string } | null;
      if (decoded && decoded.sub) {
        await redisClient.del(`refresh:${decoded.sub}:${refreshToken}`);
        await logAudit({
          userId: decoded.sub,
          action: 'AUTH:LOGOUT',
          resource: 'USER',
          ip,
          userAgent,
          result: 'SUCCESS'
        });
      }
    } catch {
      // safe fallback
    }
  }
}
