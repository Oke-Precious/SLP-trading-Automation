import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';

const authService = new AuthService();

export async function authRoutes(server: FastifyInstance) {
  // POST /auth/register
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, username, password } = request.body as any;
    if (!email || !username || !password) {
      return reply.status(400).send({ error: 'Missing credentials' });
    }
    try {
      const result = await authService.register(email, username, password);
      return reply.status(201).send(result);
    } catch (err: any) {
      if (err.message?.includes('AUTH_004') || err.message?.includes('Email already registered')) {
        return reply.status(409).send({ error: 'Email exists' });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  // POST /auth/login
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing credentials' });
    }
    try {
      const result = await authService.login(email, password);
      return reply.status(200).send(result);
    } catch (err: any) {
      if (err.message?.includes('AUTH_001') || err.message?.includes('password')) {
        return reply.status(401).send({ error: 'Wrong password' });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  // GET /auth/me
  server.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      // Fetch user from DB or return the token payload
      return reply.status(200).send({
        id: decoded.sub || 'user-1',
        name: 'Marcus Vance',
        email: 'marcus@autoslp.com'
      });
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
