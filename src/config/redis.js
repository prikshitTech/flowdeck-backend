import { Redis } from 'ioredis';

import env from './env.js';
import logger from './logger.js';

const connections = new Set();

export function createRedisClient(options = {}) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
    ...options
  });

  client.on('error', (error) => logger.error({ err: error }, 'redis error'));
  connections.add(client);
  return client;
}

export const redis = createRedisClient();

export async function connectRedis() {
  await redis.connect();
  logger.info('redis connected');
  return redis;
}

export async function disconnectRedis() {
  await Promise.all([...connections].map((client) => client.quit().catch(() => client.disconnect())));
  connections.clear();
}
