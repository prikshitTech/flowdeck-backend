import { Redis, type RedisOptions } from 'ioredis';

import env from './env.js';
import logger from './logger.js';

const connections = new Set<Redis>();

export function createRedisClient(options: RedisOptions = {}): Redis {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (attempt: number) => Math.min(attempt * 200, 3000),
    ...options
  });

  client.on('error', (error: Error) => logger.error({ err: error }, 'redis error'));
  connections.add(client);
  return client;
}

export const redis = createRedisClient();

export async function connectRedis(): Promise<Redis> {
  await redis.connect();
  logger.info('redis connected');
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all(
    [...connections].map((client) =>
      client.quit().catch(() => {
        client.disconnect();
      })
    )
  );
  connections.clear();
}
