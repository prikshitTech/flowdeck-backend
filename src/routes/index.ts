import { Router } from 'express';

import mongoose from 'mongoose';

import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import analyticsRoutes from './analytics.routes.js';
import auditRoutes from './audit.routes.js';
import boardRoutes from './board.routes.js';
import channelRoutes from './channel.routes.js';
import fileRoutes from './file.routes.js';
import searchRoutes from './search.routes.js';
import notificationRoutes from './notification.routes.js';
import pageRoutes from './page.routes.js';
import workspaceRoutes from './workspace.routes.js';
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
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/workspaces/:workspaceId/pages', pageRoutes);
router.use('/workspaces/:workspaceId/boards', boardRoutes);
router.use('/workspaces/:workspaceId/channels', channelRoutes);
router.use('/workspaces/:workspaceId/audit-logs', auditRoutes);
router.use('/workspaces/:workspaceId/files', fileRoutes);
router.use('/workspaces/:workspaceId/search', searchRoutes);
router.use('/workspaces/:workspaceId/analytics', analyticsRoutes);
router.use('/workspaces', workspaceRoutes);

export default router;
