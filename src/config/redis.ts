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

  let outageReported = false;

  client.on('error', (error: Error) => {
    if (!outageReported) {
      outageReported = true;
      logger.warn({ err: error }, 'redis unreachable, retrying in the background');
    }
  });

  client.on('ready', () => {
    if (outageReported) {
      outageReported = false;
      logger.info('redis connection restored');
    }
  });

  connections.add(client);
  return client;
}

export const redis = createRedisClient();

export async function connectRedis(): Promise<boolean> {
  try {
    await redis.connect();
    logger.info('redis connected');
    return true;
  } catch {
    logger.warn('starting without redis: caching, rate limit counters and queues fall back until it comes back');
    return false;
  }
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
