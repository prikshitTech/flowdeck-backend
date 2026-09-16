import { createServer } from 'node:http';

import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { createRealtimeServer } from './sockets/index.js';
import { routeAuditsThroughQueue, scheduleRecurringJobs, startWorkers, stopWorkers } from './queues/bootstrap.js';

async function bootstrap() {
  await connectDatabase();
  await connectRedis();

  routeAuditsThroughQueue();

  if (env.RUN_WORKERS_IN_API) {
    startWorkers();
    await scheduleRecurringJobs();
  }

  const server = createServer(app);
  const realtime = await createRealtimeServer(server);

  server.listen(env.PORT, () => logger.info(`api and realtime listening on port ${env.PORT}`));

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info(`${signal} received, shutting down`);
    await realtime.close();
    server.close();
    await stopWorkers();
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
