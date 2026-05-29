import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/db.js';
import { redis } from '../../shared/redis.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/utils/logger.js';
import { privateKey, publicKey } from '../../shared/utils/security.js';
import crypto from 'crypto';

export class AuthService {
  async register(
    email: string,
    username: string,
    password: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ) {
    // Validate
    if (!email.includes('@')) {
      throw new Error('VALIDATION_001: Invalid email');
    }
    if (password.length < 8) {
      throw new Error('VALIDATION_001: Password must be 8+ chars');
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) {
      throw new Error(
        existing.email === email 
          ? 'AUTH_004: Email already registered' 
          : 'AUTH_005: Username taken'
      );
    }

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

    const tokens = await this.generateTokens(user.id);
    logger.info(`User registered: ${email}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(
    email: string,
    password: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Track failed attempts
    const failKey = `auth:fails:${email}`;
    const fails = parseInt((await redis.get(failKey)) || '0');
    if (fails >= 5) {
      throw new Error('AUTH_007: Account temporarily locked due to 5 consecutive failures. Try again in 30 minutes.');
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await redis.setex(failKey, 1800, String(fails + 1));
      throw new Error('AUTH_001: Invalid email or password');
    }

    // Clear fail counter on success
    await redis.del(failKey);
    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { lastLoginAt: new Date() } 
    });

    const tokens = await this.generateTokens(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(
    token: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ) {
    let payload: any;
    try { 
      payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }); 
    } catch { 
      throw new Error('AUTH_002: Invalid refresh token'); 
    }

    const tokenHash = this.hashToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.used || new Date() > stored.expiresAt) {
      // Possible token reuse — invalidate family
      if (stored) {
        await prisma.refreshToken.deleteMany({ where: { family: stored.family } });
      }
      throw new Error('AUTH_002: Refresh token invalid or reused');
    }

    // Mark old token as used
    await prisma.refreshToken.update({ where: { tokenHash }, data: { used: true } });

    // Issue new pair
    const tokens = await this.generateTokens(payload.sub, stored.family);
    return tokens;
  }

  async logout(
    token: string,
    ip: string = '0.0.0.0',
    userAgent: string = 'unknown'
  ) {
    const tokenHash = this.hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { used: true }
    });
  }

  async generateTokens(userId: string, family = uuidv4()) {
    const accessToken = jwt.sign(
      { sub: userId, type: 'access' },
      privateKey,
      { expiresIn: '15m', algorithm: 'RS256' }
    );
    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      privateKey,
      { expiresIn: '7d', algorithm: 'RS256' }
    );

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    return { accessToken, refreshToken };
  }

  hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  sanitizeUser(user: any) {
    const { passwordHash, twoFASecret, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
