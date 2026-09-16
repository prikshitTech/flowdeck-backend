import logger from '../config/logger.js';
import { redis } from '../config/redis.js';

async function attempt<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    logger.warn({ err: error }, 'redis command failed, continuing without cache');
    return fallback;
  }
}

export function readJson<T>(key: string): Promise<T | null> {
  return attempt<T | null>(async () => {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);
}

export function writeJson(key: string, value: unknown, ttlSeconds: number) {
  return attempt<string | null>(() => redis.set(key, JSON.stringify(value), 'EX', ttlSeconds), null);
}

export function drop(...keys: string[]) {
  return attempt<number>(() => redis.del(...keys), 0);
}

export function dropByPrefix(prefix: string) {
  return attempt<void>(async () => {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 200 });

    for await (const batch of stream as AsyncIterable<string[]>) {
      if (batch.length > 0) {
        await redis.del(...batch);
      }
    }
  }, undefined);
}

export async function remember<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
  const cached = await readJson<T>(key);

  if (cached !== null) {
    return cached;
  }

  const fresh = await resolver();
  await writeJson(key, fresh, ttlSeconds);
  return fresh;
}

export function bump(key: string, ttlSeconds: number) {
  return attempt<number>(async () => {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }

    return count;
  }, 0);
}

export function dip(key: string) {
  return attempt<number>(async () => Math.max(await redis.decr(key), 0), 0);
}

export function countOf(key: string) {
  return attempt<number>(async () => Number(await redis.get(key)) || 0, 0);
}

export function secondsLeft(key: string) {
  return attempt<number>(async () => Math.max(await redis.ttl(key), 0), 0);
}

export function markFlag(key: string, ttlSeconds: number) {
  return attempt<string | null>(() => redis.set(key, '1', 'EX', ttlSeconds), null);
}

export function hasFlag(key: string) {
  return attempt<boolean>(async () => (await redis.exists(key)) === 1, false);
}
