import { Router } from 'express';

import * as insightController from '../controllers/insight.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { boardAnalyticsSchema, overviewSchema } from '../validators/insight.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);

router.use(authenticate);

router.get('/overview', validate(overviewSchema), reader, insightController.overview);
router.get('/members', validate(overviewSchema), reader, insightController.members);
router.get('/boards/:boardId', validate(boardAnalyticsSchema), reader, insightController.board);

export default router;
