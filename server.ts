import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log(process.env.NEXT_PUBLIC_APP_NAME);

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Detect production or development robustly
const isProd = process.env.NODE_ENV === 'production' || !process.argv.some(arg => arg.includes('tsx') || arg.includes('server.ts'));
process.env.NODE_ENV = isProd ? 'production' : 'development';

// 1. Force Fastify backend server to run on port 3002 internally
process.env.PORT = '3002';
process.env.HOST = '127.0.0.1';

async function startServer() {
  // Import and boot the Fastify backend programmatically in the same Node.js runtime process
  try {
    console.log('[Unified Server] Attempting programmatic boot of autoSLP-server Fastify backend...');
    await import('./autoSLP-server/src/index.ts');
    console.log('[Unified Server] autoSLP-server Fastify backend booted successfully on port 3002!');
  } catch (error) {
    console.error('[Unified Server] CRITICAL WARNING: Fastify backend failed to boot programmatically.', error);
    console.log('[Unified Server] Booting front-end standalone Express fallback on port 3000 to keep preview active.');
  }

  const app = express();
  const PORT = 3000;

  // 2. Set up Proxy for local Fastify server
  // This directs any requests to /auth, /pois, etc., and /socket.io from port 3000 to local port 3002
  const backendProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error('[Unified Proxy Error]', err);
    },
    pathRewrite: (pathStr) => {
      // Robust rewrite rules to map /api/v1 prefix gracefully to standard Fastify endpoints
      if (pathStr.startsWith('/api/v1/')) {
        const subPath = pathStr.replace('/api/v1/', '/');
        if (
          subPath.startsWith('/auth') ||
          subPath.startsWith('/pois') ||
          subPath.startsWith('/market') ||
          subPath.startsWith('/features') ||
          subPath.startsWith('/feedback') ||
          subPath.startsWith('/ai') ||
          subPath.startsWith('/signals') ||
          subPath.startsWith('/alerts') ||
          subPath.startsWith('/user')
        ) {
          return subPath;
        }
      }
      return pathStr;
    }
  });

  // Wire the proxy for Fastify routes
  app.use([
    '/auth',
    '/pois',
    '/market',
    '/features',
    '/feedback',
    '/ai',
    '/signals',
    '/alerts',
    '/user',
    '/api/v1',
    '/socket.io'
  ], backendProxy);

  // 3. Mount Vite middleware or Static files depending on NODE_ENV environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Unified Server] Running on http://localhost:${PORT}`);
    console.log(`[Unified Server] Reverse-proxying API calls and websockets to Fastify on http://127.0.0.1:3002`);
  });
}

startServer();
