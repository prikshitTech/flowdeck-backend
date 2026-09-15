import { Router } from 'express';

import * as insightController from '../controllers/insight.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { searchLimiter } from '../middlewares/rateLimiter.js';
import { searchSchema, suggestSchema } from '../validators/insight.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);

router.use(authenticate);

router.get('/', searchLimiter, validate(searchSchema), reader, insightController.search);
router.get('/suggestions', searchLimiter, validate(suggestSchema), reader, insightController.suggest);

export default router;
