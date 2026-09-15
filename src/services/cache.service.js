import logger from '../config/logger.js';
import { redis } from '../config/redis.js';

async function attempt(action, fallback = null) {
  try {
    return await action();
  } catch (error) {
    logger.warn({ err: error }, 'redis command failed, continuing without cache');
    return fallback;
  }
}

export function readJson(key) {
  return attempt(async () => {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  });
}

export function writeJson(key, value, ttlSeconds) {
  return attempt(() => redis.set(key, JSON.stringify(value), 'EX', ttlSeconds));
}

export function drop(...keys) {
  return attempt(() => redis.del(...keys));
}

export function dropByPrefix(prefix) {
  return attempt(async () => {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 200 });

    for await (const batch of stream) {
      if (batch.length > 0) {
        await redis.del(...batch);
      }
    }
  });
}

export async function remember(key, ttlSeconds, resolver) {
  const cached = await readJson(key);

  if (cached !== null) {
    return cached;
  }

  const fresh = await resolver();
  await writeJson(key, fresh, ttlSeconds);
  return fresh;
}

export function bump(key, ttlSeconds) {
  return attempt(async () => {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }

    return count;
  }, 0);
}

export function dip(key) {
  return attempt(async () => Math.max(await redis.decr(key), 0), 0);
}

export function countOf(key) {
  return attempt(async () => Number(await redis.get(key)) || 0, 0);
}

export function secondsLeft(key) {
  return attempt(async () => Math.max(await redis.ttl(key), 0), 0);
}

export function markFlag(key, ttlSeconds) {
  return attempt(() => redis.set(key, '1', 'EX', ttlSeconds));
}

export function hasFlag(key) {
  return attempt(async () => (await redis.exists(key)) === 1, false);
}
