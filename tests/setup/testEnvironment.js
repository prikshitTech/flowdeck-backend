import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';
import { disconnectRedis } from '../../src/config/redis.js';

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
});
