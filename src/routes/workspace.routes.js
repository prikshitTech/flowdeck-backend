import { Router } from 'express';

import * as workspaceController from '../controllers/workspace.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { writeLimiter } from '../middlewares/rateLimiter.js';
import {
  addMemberSchema,
  createWorkspaceSchema,
  listMembersSchema,
  listWorkspacesSchema,
  memberParamsSchema,
  transferOwnershipSchema,
  updateMemberSchema,
  updateWorkspaceSchema,
  workspaceParamsSchema
} from '../validators/workspace.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', writeLimiter, validate(createWorkspaceSchema), workspaceController.create);
router.get('/', validate(listWorkspacesSchema), workspaceController.list);

router.get(
  '/:workspaceId',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  workspaceController.detail
);

router.patch(
  '/:workspaceId',
  writeLimiter,
  validate(updateWorkspaceSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  workspaceController.update
);

router.delete(
  '/:workspaceId',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.OWNER),
  workspaceController.archive
);

router.get(
  '/:workspaceId/members',
  validate(listMembersSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  workspaceController.members
);

router.post(
  '/:workspaceId/members',
  writeLimiter,
  validate(addMemberSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  workspaceController.addMember
);

router.patch(
  '/:workspaceId/members/:memberId',
  validate(updateMemberSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  workspaceController.updateMember
);

router.delete(
  '/:workspaceId/members/:memberId',
  validate(memberParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  workspaceController.removeMember
);

router.post(
  '/:workspaceId/transfer-ownership',
  validate(transferOwnershipSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.OWNER),
  workspaceController.transferOwnership
);

router.post(
  '/:workspaceId/leave',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  workspaceController.leave
);

export default router;
