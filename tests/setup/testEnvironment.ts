import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'fatal';
process.env.MONGO_URI = replset.getUri('flowdeck_test');
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-enough-length';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-enough-length';

const { connectDatabase, disconnectDatabase } = await import('../../src/config/database.js');
const { disconnectRedis } = await import('../../src/config/redis.js');

beforeAll(async () => {
  await connectDatabase();
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);

  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
  await disconnectRedis();
  await replset.stop();
});
