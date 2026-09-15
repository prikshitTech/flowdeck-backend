import { Router } from 'express';

import * as workspaceController from '../controllers/workspace.controller.js';
import auditTrail from '../middlewares/auditTrail.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../constants/audit.js';
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

router.post('/', writeLimiter, validate(createWorkspaceSchema), auditTrail(AUDIT_ACTION.WORKSPACE_CREATED, AUDIT_ENTITY.WORKSPACE), workspaceController.create);
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
  auditTrail(AUDIT_ACTION.WORKSPACE_UPDATED, AUDIT_ENTITY.WORKSPACE),
  workspaceController.update
);

router.delete(
  '/:workspaceId',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.OWNER),
  auditTrail(AUDIT_ACTION.WORKSPACE_ARCHIVED, AUDIT_ENTITY.WORKSPACE),
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
  auditTrail(AUDIT_ACTION.MEMBER_ADDED, AUDIT_ENTITY.MEMBER),
  workspaceController.addMember
);

router.patch(
  '/:workspaceId/members/:memberId',
  validate(updateMemberSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  auditTrail(AUDIT_ACTION.MEMBER_ROLE_CHANGED, AUDIT_ENTITY.MEMBER),
  workspaceController.updateMember
);

router.delete(
  '/:workspaceId/members/:memberId',
  validate(memberParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.ADMIN),
  auditTrail(AUDIT_ACTION.MEMBER_REMOVED, AUDIT_ENTITY.MEMBER),
  workspaceController.removeMember
);

router.post(
  '/:workspaceId/transfer-ownership',
  validate(transferOwnershipSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.OWNER),
  auditTrail(AUDIT_ACTION.OWNERSHIP_TRANSFERRED, AUDIT_ENTITY.WORKSPACE),
  workspaceController.transferOwnership
);

router.post(
  '/:workspaceId/leave',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  workspaceController.leave
);

export default router;
