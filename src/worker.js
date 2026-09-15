import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { scheduleRecurringJobs, startWorkers, stopWorkers } from './queues/bootstrap.js';

async function bootstrap() {
  await connectDatabase();
  await connectRedis();

  startWorkers();
  await scheduleRecurringJobs();

  const shutdown = async (signal) => {
    logger.info(`${signal} received, stopping workers`);
    await stopWorkers();
    await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'failed to start workers');
  process.exit(1);
});
