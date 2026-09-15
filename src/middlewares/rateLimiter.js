import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import env from '../config/env.js';
import RateLimitStore from '../helpers/rateLimitStore.js';
import { ERROR_CODE, HTTP_STATUS } from '../constants/statusCodes.js';

export function createRateLimiter({ name, windowSeconds, max, byUser = false }) {
  return rateLimit({
    windowMs: windowSeconds * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RateLimitStore(`rl:${name}:`),
    keyGenerator: (req) => (byUser && req.auth ? `user:${req.auth.userId}` : `ip:${ipKeyGenerator(req.ip)}`),
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests, please slow down',
        code: ERROR_CODE.RATE_LIMITED,
        details: { retryAfter: windowSeconds }
      });
    }
  });
}

export const globalLimiter = createRateLimiter({
  name: 'global',
  windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
  max: env.RATE_LIMIT_MAX
});

export const authLimiter = createRateLimiter({ name: 'auth', windowSeconds: 60, max: 12 });
export const writeLimiter = createRateLimiter({ name: 'write', windowSeconds: 60, max: 90, byUser: true });
export const uploadLimiter = createRateLimiter({ name: 'upload', windowSeconds: 300, max: 25, byUser: true });
export const searchLimiter = createRateLimiter({ name: 'search', windowSeconds: 60, max: 40, byUser: true });
