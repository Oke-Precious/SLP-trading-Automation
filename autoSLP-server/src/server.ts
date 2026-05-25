import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import helmet from '@fastify/helmet';
import { config } from './config';
import { sendError } from './shared/utils/response';
import { authRoutes } from './modules/auth/auth.routes';
import { poiRoutes } from './modules/poi/poi.routes';
import { marketRoutes } from './modules/market/market.routes';
import { privateKey, publicKey } from './shared/utils/security';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true
  });

  // 1. Enforce HTTPS: Redirect HTTP to HTTPS in server configuration
  server.addHook('onRequest', async (request, reply) => {
    const proto = request.headers['x-forwarded-proto'];
    if (proto === 'http') {
      const host = request.headers.host;
      return reply.redirect(301, `https://${host}${request.url}`);
    }
  });

  // 2. Set HTTP security headers via @fastify/helmet
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"]
      }
    },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Referrer-Policy
    hsts: { maxAge: 31536000, includeSubDomains: true } // HSTS: 1 year
  });

  // Extra headers hook (Permissions-Policy, nosniff redundancy)
  server.addHook('preHandler', async (request, reply) => {
    reply.header('Permissions-Policy', 'camera=(), microphone=()');
    reply.header('X-Content-Type-Options', 'nosniff');
  });

  // 3. CORS: Allow only NEXT_PUBLIC_APP_URL origin (allow undefined origins exclusively for tests / internal requests)
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin || !allowedOrigin || origin === allowedOrigin) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // 4. Secure HttpOnly Cookie configurations
  await server.register(cookie);

  // 5. Asymmetric Key JWT Config (RS256 algorithm)
  await server.register(jwt, {
    secret: {
      private: privateKey,
      public: publicKey
    },
    sign: { algorithm: 'RS256' },
    verify: { algorithms: ['RS256'] },
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  // 6. OpenAPI / Swagger documentation
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'AutoSLP Server Rest APIs',
        description: 'Automated SMC Order Blocks & Breaker blocks plotting engine',
        version: '1.0.0'
      },
      servers: [
        { url: `http://${config.HOST}:${config.PORT}/api/v1` }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Register modular hardened routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(poiRoutes, { prefix: '/pois' });
  await server.register(marketRoutes, { prefix: '/market' });

  // Global Error Handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    const errorCode = error.message?.startsWith('VALIDATION_') ? 'VALIDATION_001' : 'INTERNAL_SERVER_ERROR';
    reply.status(error.statusCode || 500).send(sendError(errorCode, error.message || 'An unexpected server error occurred.'));
  });

  // Health and verification checks route
  server.get('/api/v1/health', async () => {
    return { status: 'healthy', environment: 'production', timestamp: new Date() };
  });

  return server;
}
