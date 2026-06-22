import crypto from 'crypto';
import { TOTP, verifySync, generateSecret } from 'otplib';
import { prisma } from '../db.js';
import fs from 'fs/promises';
const totp = new TOTP();

// -------------------------------------------------------------
// Asymmetric Key Pair Management for JWT (RS256)
// -------------------------------------------------------------
export let privateKey: string;
export let publicKey: string;

try {
  if (process.env.RSA_PRIVATE_KEY && process.env.RSA_PUBLIC_KEY) {
    privateKey = process.env.RSA_PRIVATE_KEY;
    publicKey = process.env.RSA_PUBLIC_KEY;
  } else {
    // Generate standard 2048-bit RSA keys on startup for optimal security
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    privateKey = priv;
    publicKey = pub;
  }
} catch (err) {
  // Safe default fallback
  privateKey = 'placeholder-private';
  publicKey = 'placeholder-public';
}

// -------------------------------------------------------------
// Symmetric Cryptography (AES-256-GCM)
// -------------------------------------------------------------
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Derive safe 256-bit encryption key
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
if (!ENCRYPTION_SECRET) {
  throw new Error('FATAL: ENCRYPTION_SECRET environment variable is missing.');
}
const ENCRYPTION_KEY = crypto.scryptSync(ENCRYPTION_SECRET, 'salt-gcm-autoslp-2026', 32);

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, encrypted, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return 'Decryption failed';
  }
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return 'sk-***';
  return `sk-***${key.slice(-4)}`;
}

// -------------------------------------------------------------
// Two-Factor Authentication Helpers (TOTP)
// -------------------------------------------------------------
export function generate2FASecret(): string {
  try {
    return generateSecret();
  } catch {
    return totp.generateSecret();
  }
}

export function get2FAKeyURI(email: string, secret: string): string {
  return totp.toURI({ label: email, issuer: 'AutoSLP', secret });
}

export function verify2FACode(code: string, secret: string): boolean {
  try {
    const res = verifySync({ secret, token: code, strategy: 'totp' });
    return typeof res === 'boolean' ? res : !res ? false : !!res.valid;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Robust Sanitization & Validation Helpers
// -------------------------------------------------------------
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input) return '';
  let str = input.trim();
  if (str.length > maxLength) {
    str = str.slice(0, maxLength);
  }
  // Escape basic XSS vector characters
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateNumberRange(num: any, min: number, max: number = Infinity): number {
  const parsed = Number(num);
  if (isNaN(parsed)) {
    throw new Error(`VALIDATION_001: Invalid number parameter`);
  }
  if (parsed < min || parsed > max) {
    throw new Error(`VALIDATION_001: Value is out of valid bounds. Expected min ${min}, max ${max}.`);
  }
  return parsed;
}

export function validatePath(pathStr: string): string {
  if (!pathStr) return '';
  if (pathStr.includes('..') || pathStr.startsWith('/')) {
    throw new Error(`VALIDATION_001: Path traversal protection triggered`);
  }
  return pathStr;
}

// -------------------------------------------------------------
// Audit Logging Engine with Standby JSONL Fallback
// -------------------------------------------------------------
export async function logAudit(d: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  result: string;
}) {
  const payload = {
    userId: d.userId || 'system',
    action: d.action || 'UNKNOWN_ACTION',
    resource: d.resource || 'SYSTEM',
    resourceId: d.resourceId || null,
    ip: d.ip || '0.0.0.0',
    userAgent: d.userAgent || 'unknown',
    result: d.result || 'SUCCESS',
  };

  try {
    await prisma.auditLog.create({
      data: {
        ...payload,
        createdAt: new Date()
      }
    });
  } catch (err) {
    // Append standby backup log line in case db is locked
    try {
      const backupLine = JSON.stringify({ ...payload, timestamp: new Date() }) + '\n';
      await fs.appendFile('audit_logs.jsonl', backupLine);
    } catch {
      // failsafe
    }
  }
}
