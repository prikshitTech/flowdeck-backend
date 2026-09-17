import ApiError from '../helpers/apiError.js';
import asyncHandler from '../helpers/asyncHandler.js';
import Membership from '../models/membership.model.js';
import type { MembershipContext } from '../types/express.js';
import { CACHE_TTL } from '../constants/cacheKeys.js';
import { WORKSPACE_MESSAGES } from '../constants/messages.js';
import { WORKSPACE_ROLE, WORKSPACE_ROLE_RANK, type WorkspaceRole } from '../constants/roles.js';
import { isSuperAdmin } from '../helpers/access.js';
import { drop, remember } from '../services/cache.service.js';

const membershipKey = (workspaceId: string, userId: string) => `cache:membership:${workspaceId}:${userId}`;

export function loadMembership(workspaceId: string, userId: string): Promise<MembershipContext | false> {
  return remember<MembershipContext | false>(membershipKey(workspaceId, userId), CACHE_TTL.MEDIUM, async () => {
    const membership = await Membership.findOne({ workspace: workspaceId, user: userId })
      .select('role workspace user')
      .lean();

    return membership ? { role: membership.role as WorkspaceRole, workspace: String(membership.workspace) } : false;
  });
}

export function forgetMembership(workspaceId: string, userId: string) {
  return drop(membershipKey(workspaceId, userId));
}

export function requireWorkspaceRole(minimumRole: WorkspaceRole) {
  return asyncHandler(async (req, _res, next) => {
    const workspaceId: string | undefined = req.params.workspaceId ?? req.body?.workspaceId;

    if (!workspaceId) {
      throw ApiError.badRequest('A workspace identifier is required');
    }

    const membership = isSuperAdmin(req.auth.role)
      ? { role: WORKSPACE_ROLE.OWNER, workspace: String(workspaceId) }
      : await loadMembership(workspaceId, req.auth.userId);

    if (!membership) {
      throw ApiError.forbidden(WORKSPACE_MESSAGES.NOT_A_MEMBER);
    }

    if (WORKSPACE_ROLE_RANK[membership.role] < WORKSPACE_ROLE_RANK[minimumRole]) {
      throw ApiError.forbidden(WORKSPACE_MESSAGES.ROLE_TOO_LOW);
    }

    req.workspaceId = String(workspaceId);
    req.membership = membership;

    next();
  });
}
