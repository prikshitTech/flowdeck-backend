import ApiError from '../helpers/apiError.js';
import asyncHandler from '../helpers/asyncHandler.js';
import Membership from '../models/membership.model.js';
import { CACHE_TTL } from '../constants/cacheKeys.js';
import { WORKSPACE_MESSAGES } from '../constants/messages.js';
import { WORKSPACE_ROLE_RANK } from '../constants/roles.js';
import { drop, remember } from '../services/cache.service.js';

const membershipKey = (workspaceId, userId) => `cache:membership:${workspaceId}:${userId}`;

export function loadMembership(workspaceId, userId) {
  return remember(membershipKey(workspaceId, userId), CACHE_TTL.MEDIUM, async () => {
    const membership = await Membership.findOne({ workspace: workspaceId, user: userId })
      .select('role workspace user')
      .lean();

    return membership ? { role: membership.role, workspace: String(membership.workspace) } : false;
  });
}

export function forgetMembership(workspaceId, userId) {
  return drop(membershipKey(workspaceId, userId));
}

export function requireWorkspaceRole(minimumRole) {
  return asyncHandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId ?? req.body.workspaceId;

    if (!workspaceId) {
      throw ApiError.badRequest('A workspace identifier is required');
    }

    const membership = await loadMembership(workspaceId, req.auth.userId);

    if (!membership) {
      throw ApiError.forbidden(WORKSPACE_MESSAGES.NOT_A_MEMBER);
    }

    if (WORKSPACE_ROLE_RANK[membership.role] < WORKSPACE_ROLE_RANK[minimumRole]) {
      throw ApiError.forbidden(WORKSPACE_MESSAGES.ROLE_TOO_LOW);
    }

    req.workspaceId = String(workspaceId);
    req.membership = membership;

    return next();
  });
}
