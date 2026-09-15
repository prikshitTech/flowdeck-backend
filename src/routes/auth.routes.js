import { Router } from 'express';

import * as authController from '../controllers/auth.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  sessionParamsSchema,
  updateProfileSchema
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);

router.use(authenticate);

router.get('/me', authController.profile);
router.patch('/me', validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.post('/logout-all', authController.logoutEverywhere);
router.get('/sessions', authController.listSessions);
router.delete('/sessions/:sessionId', validate(sessionParamsSchema), authController.revokeSession);

export default router;
