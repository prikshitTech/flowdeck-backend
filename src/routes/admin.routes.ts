import { Router } from 'express';

import * as adminController from '../controllers/admin.controller.js';
import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { superAdminSchema } from '../validators/admin.validator.js';

const router = Router();

router.get('/setup', adminController.status);
router.post('/setup', authLimiter, validate(superAdminSchema), adminController.createSuperAdmin);

export default router;
