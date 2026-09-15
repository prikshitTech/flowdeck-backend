import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

async function bootstrap() {
  await connectDatabase();
  await connectRedis();

  const server = app.listen(env.PORT, () => logger.info(`api listening on port ${env.PORT}`));

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close();
    await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'failed to start api');
  process.exit(1);
});
