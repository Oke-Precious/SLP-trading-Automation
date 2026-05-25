import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { sendError } from './shared/utils/response';
import { authRoutes } from './modules/auth/auth.routes';
import { poiRoutes } from './modules/poi/poi.routes';
import { marketRoutes } from './modules/market/market.routes';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true
  });

  // 1. CORS plugin config
  await server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // 2. Cookie config
  await server.register(cookie);

  // 3. JWT config
  await server.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  // 4. OpenAPI / Swagger documentation
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

  // Register modular routes
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
