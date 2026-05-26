import { createServer } from './server.js';
import { config } from './config.js';
import { logger } from './shared/utils/logger.js';

async function start() {
  const app = await createServer();
  
  try {
    app.log.info(`Starting backend applet server on standard configuration...`);
    await app.listen({ port: config.PORT, host: config.HOST });
    
    logger.info(`AutoSLP Production Back-end ready!`);
    logger.info(`Access Swagger Endpoint Docs live at: http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
