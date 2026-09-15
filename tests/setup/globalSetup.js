import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalSetup() {
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });

  globalThis.__MONGO_REPLSET__ = replset;

  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'fatal';
  process.env.MONGO_URI = replset.getUri('flowdeck_test');
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-enough-length';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-enough-length';
}
