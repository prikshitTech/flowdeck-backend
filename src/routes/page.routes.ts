import { Router } from 'express';

import * as pageController from '../controllers/page.controller.js';
import auditTrail from '../middlewares/auditTrail.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../constants/audit.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { writeLimiter } from '../middlewares/rateLimiter.js';
import {
  createPageSchema,
  listPagesSchema,
  listRevisionsSchema,
  movePageSchema,
  pageParamsSchema,
  reorderPagesSchema,
  restoreRevisionSchema,
  treeSchema,
  updatePageSchema
} from '../validators/page.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);
const writer = requireWorkspaceRole(WORKSPACE_ROLE.MEMBER);

router.use(authenticate);

router.post('/', writeLimiter, validate(createPageSchema), writer, auditTrail(AUDIT_ACTION.PAGE_CREATED, AUDIT_ENTITY.PAGE), pageController.create);
router.get('/', validate(listPagesSchema), reader, pageController.list);
router.get('/tree', validate(treeSchema), reader, pageController.tree);
router.patch('/reorder', writeLimiter, validate(reorderPagesSchema), writer, pageController.reorder);

router.get('/:pageId', validate(pageParamsSchema), reader, pageController.detail);
router.patch('/:pageId', writeLimiter, validate(updatePageSchema), writer, auditTrail(AUDIT_ACTION.PAGE_UPDATED, AUDIT_ENTITY.PAGE), pageController.update);
router.delete('/:pageId', validate(pageParamsSchema), writer, auditTrail(AUDIT_ACTION.PAGE_ARCHIVED, AUDIT_ENTITY.PAGE), pageController.archive);
router.post('/:pageId/move', writeLimiter, validate(movePageSchema), writer, auditTrail(AUDIT_ACTION.PAGE_MOVED, AUDIT_ENTITY.PAGE), pageController.move);
router.get('/:pageId/revisions', validate(listRevisionsSchema), reader, pageController.revisions);
router.post(
  '/:pageId/revisions/:version/restore',
  writeLimiter,
  validate(restoreRevisionSchema),
  writer,
  auditTrail(AUDIT_ACTION.PAGE_RESTORED, AUDIT_ENTITY.PAGE),
  pageController.restore
);

export default router;
