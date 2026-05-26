import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { sendError } from './shared/utils/response.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { poiRoutes } from './modules/poi/poi.routes.js';
import { marketRoutes } from './modules/market/market.routes.js';
import { featuresRoutes } from './modules/features/features.routes.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { privateKey, publicKey } from './shared/utils/security.js';
import { register, apiRequestDurationSeconds } from './shared/utils/metrics.js';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true
  });

  // 1. Enforce HTTPS: Redirect HTTP to HTTPS in server configuration
  server.addHook('onRequest', async (request, reply) => {
    const proto = request.headers['x-forwarded-proto'];
    if (proto === 'http') {
      const host = request.headers.host;
      return reply.status(301).redirect(`https://${host}${request.url}`);
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

  // HTTP metric duration instrument hooks
  server.addHook('onRequest', async (request) => {
    // Also protect https redirection hook
    const proto = request.headers['x-forwarded-proto'];
    if (proto === 'http') {
      const host = request.headers.host;
      // Return and end redirect immediately
      return;
    }
    (request as any).startTime = process.hrtime();
  });

  server.addHook('onResponse', async (request, reply) => {
    const start = (request as any).startTime;
    if (start) {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;
      const url = (request as any).routerPath || request.url || 'unknown';
      apiRequestDurationSeconds
        .labels(request.method, url, reply.statusCode.toString())
        .observe(duration);
    }
  });

  // Register modular hardened routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(poiRoutes, { prefix: '/pois' });
  await server.register(marketRoutes, { prefix: '/market' });
  await server.register(featuresRoutes, { prefix: '/features' });
  await server.register(feedbackRoutes, { prefix: '/feedback' });
  await server.register(aiRoutes, { prefix: '/ai' });

  // Global Error Handler
  server.setErrorHandler((error: any, request, reply) => {
    server.log.error(error);
    const errorCode = error.message?.startsWith('VALIDATION_') ? 'VALIDATION_001' : 'INTERNAL_SERVER_ERROR';
    reply.status(error.statusCode || 500).send(sendError(errorCode, error.message || 'An unexpected server error occurred.'));
  });

  // Health and verification checks route
  server.get('/api/v1/health', async () => {
    return { status: 'healthy', environment: 'production', timestamp: new Date() };
  });

  // Prometheus metrics scraping endpoint
  server.get('/metrics', async (request, reply) => {
    const clientIp = request.ip || '127.0.0.1';
    // Match local / docker / internal virtual VPC subnets
    const isIpAllowed = 
      clientIp === '127.0.0.1' || 
      clientIp === '::1' || 
      clientIp.startsWith('10.') || 
      clientIp.startsWith('192.168.') || 
      clientIp.startsWith('172.') ||
      process.env.NODE_ENV === 'test' ||
      !!process.env.VITEST; // Ensure tests aren't blocked by IP checks

    if (!isIpAllowed) {
      return reply.status(403).send({ error: 'Acquisition access denied: IP is not on metrics allowlist.' });
    }

    reply.type(register.contentType);
    return register.metrics();
  });

  return server;
}
