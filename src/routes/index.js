import { Router } from 'express';

import mongoose from 'mongoose';

import authRoutes from './auth.routes.js';
import { redis } from '../config/redis.js';

const router = Router();

router.get('/health', (req, res) => {
  res.ok(
    {
      uptime: Math.round(process.uptime()),
      mongo: mongoose.connection.readyState === 1 ? 'up' : 'down',
      redis: redis.status === 'ready' ? 'up' : 'down'
    },
    'Service is healthy'
  );
});

router.use('/auth', authRoutes);

export default router;
