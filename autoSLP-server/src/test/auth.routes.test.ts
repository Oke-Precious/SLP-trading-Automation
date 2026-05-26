import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createServer } from '../server.js';

// Mock AuthService inside routes
vi.mock('../modules/auth/auth.service.js', () => {
  return {
    AuthService: class {
      async register(email: string) {
        if (email === 'exists@autoslp.com') {
          throw new Error('AUTH_004: Email already registered.');
        }
        return {
          accessToken: 'mock-access',
          refreshToken: 'mock-refresh',
          user: { id: 'u1', email, username: 'testuser' },
        };
      }
      async login(email: string) {
        if (email === 'wrong@autoslp.com') {
          throw new Error('AUTH_001: Invalid credentials.');
        }
        return {
          accessToken: 'mock-access',
          refreshToken: 'mock-refresh',
          user: { id: 'u1', email, username: 'testuser' },
        };
      }
    },
  };
});

describe('Auth Routes Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await createServer();
  });

  it('POST /auth/register with valid data -> 201 + tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'new@autoslp.com', username: 'newuser', password: 'Password123!' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe('new@autoslp.com');
  });

  it('POST /auth/register with existing email -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'exists@autoslp.com', username: 'newuser', password: 'Password123!' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /auth/login with correct creds -> 200 + tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'correct@autoslp.com', password: 'Password123!' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
  });

  it('POST /auth/login with wrong password -> 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'wrong@autoslp.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me without token -> 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me with valid token -> 200 + user', async () => {
    // Generate valid jwt
    const token = app.jwt.sign({ sub: 'user-1' });
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.email).toBe('marcus@autoslp.com');
  });
});
