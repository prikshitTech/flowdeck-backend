import mongoose, { type Connection } from 'mongoose';

import env from './env.js';
import logger from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<Connection> {
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('mongo reconnected'));

  await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });

  logger.info(`mongo connected to ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
