import pino from 'pino';

import env, { isProduction, isTest } from './env.js';

const transport = isProduction || isTest
  ? undefined
  : {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
    };

const logger = pino({
  level: env.LOG_LEVEL,
  transport,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.refreshToken'],
    censor: '[redacted]'
  }
});

export default logger;
