import { Router } from 'express';

import * as auditController from '../controllers/audit.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { auditSummarySchema, listAuditSchema } from '../validators/audit.validator.js';

const router = Router({ mergeParams: true });

const auditor = requireWorkspaceRole(WORKSPACE_ROLE.ADMIN);

router.use(authenticate);

router.get('/', validate(listAuditSchema), auditor, auditController.list);
router.get('/summary', validate(auditSummarySchema), auditor, auditController.summary);

export default router;
