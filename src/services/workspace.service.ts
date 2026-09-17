
import ApiError from '../helpers/apiError.js';
import Membership from '../models/membership.model.js';
import User from '../models/user.model.js';
import Workspace from '../models/workspace.model.js';
import { CACHE_TTL, cacheKey } from '../constants/cacheKeys.js';
import { WORKSPACE_MESSAGES } from '../constants/messages.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { dropByPrefix, remember } from './cache.service.js';
import { forgetMembership } from '../middlewares/workspaceAccess.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import { withId } from '../helpers/present.js';
import { uniqueSlug } from '../helpers/slug.js';
import { withTransaction } from '../helpers/transaction.js';
import type { WorkspaceRole } from '../constants/roles.js';
import type {
  AddMemberInput,
  CreateWorkspaceInput,
  ListMembersQuery,
  ListWorkspacesQuery,
  UpdateWorkspaceInput
} from '../validators/workspace.validator.js';
import { toObjectId } from '../helpers/objectId.js';
import { NOTIFICATION_TYPE, appLink } from '../constants/notifications.js';
import { notify } from './notification.service.js';


function invalidateWorkspace(workspaceId: string) {
  return dropByPrefix(cacheKey.workspaceTag(workspaceId));
}

async function workspaceName(workspaceId: string): Promise<string> {
  const workspace = await Workspace.findById(workspaceId).select('name').lean();
  return workspace?.name ?? 'a workspace';
}

export async function createWorkspace(ownerId: string, payload: CreateWorkspaceInput) {
  return withTransaction(async (session) => {
    const [workspace] = await Workspace.create(
      [{ ...payload, slug: uniqueSlug(payload.name), owner: ownerId, memberCount: 1 }],
      { session }
    );

    await Membership.create(
      [{ workspace: workspace._id, user: ownerId, role: WORKSPACE_ROLE.OWNER, invitedBy: ownerId }],
      { session }
    );

    return workspace;
  });
}

export async function listWorkspaces(userId: string, query: ListWorkspacesQuery) {
  const result = await Membership.aggregate([
    { $match: { user: toObjectId(userId) } },
    { $lookup: { from: 'workspaces', localField: 'workspace', foreignField: '_id', as: 'workspace' } },
    { $unwind: '$workspace' },
    { $match: { 'workspace.archivedAt': null } },
    {
      $project: {
        _id: 0,
        id: '$workspace._id',
        name: '$workspace.name',
        slug: '$workspace.slug',
        description: '$workspace.description',
        memberCount: '$workspace.memberCount',
        role: '$role',
        joinedAt: '$createdAt',
        updatedAt: '$workspace.updatedAt'
      }
    },
    { $sort: { updatedAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function getWorkspace(workspaceId: string) {
  return remember(cacheKey.workspaceSummary(workspaceId), CACHE_TTL.MEDIUM, async () => {
    const workspace = await Workspace.findById(workspaceId).populate('owner', 'name email avatarUrl').lean();

    if (!workspace) {
      throw ApiError.notFound(WORKSPACE_MESSAGES.NOT_FOUND);
    }

    return withId(workspace);
  });
}

export async function updateWorkspace(workspaceId: string, payload: UpdateWorkspaceInput) {
  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    { $set: payload },
    { returnDocument: 'after', runValidators: true }
  );

  if (!workspace) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.NOT_FOUND);
  }

  await invalidateWorkspace(workspaceId);
  return workspace;
}

export async function archiveWorkspace(workspaceId: string) {
  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    { $set: { archivedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!workspace) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.NOT_FOUND);
  }

  await invalidateWorkspace(workspaceId);
  return workspace;
}

export async function listMembers(workspaceId: string, query: ListMembersQuery) {
  const result = await Membership.aggregate([
    { $match: { workspace: toObjectId(workspaceId) } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'account' } },
    { $unwind: '$account' },
    {
      $project: {
        _id: 0,
        id: '$_id',
        role: 1,
        lastSeenAt: 1,
        joinedAt: '$createdAt',
        user: {
          id: '$account._id',
          name: '$account.name',
          email: '$account.email',
          avatarUrl: '$account.avatarUrl',
          status: '$account.status'
        }
      }
    },
    { $sort: { joinedAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function addMember(workspaceId: string, actorId: string, { email, role }: AddMemberInput) {
  const account = await User.findOne({ email }).select('name email avatarUrl');

  if (!account) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.USER_NOT_FOUND);
  }

  const already = await Membership.exists({ workspace: workspaceId, user: account._id });

  if (already) {
    throw ApiError.conflict(WORKSPACE_MESSAGES.MEMBER_EXISTS);
  }

  const membership = await withTransaction(async (session) => {
    const [created] = await Membership.create(
      [{ workspace: workspaceId, user: account._id, role, invitedBy: actorId }],
      { session }
    );

    await Workspace.updateOne({ _id: workspaceId }, { $inc: { memberCount: 1 } }, { session });

    return created;
  });

  await invalidateWorkspace(workspaceId);

  await notify({
    recipients: [String(account._id)],
    workspace: workspaceId,
    type: NOTIFICATION_TYPE.MEMBER_ADDED,
    message: `added you to ${await workspaceName(workspaceId)} as ${role}`,
    actor: actorId,
    link: appLink.workspace(workspaceId)
  });

  return { membership, account };
}

export async function updateMemberRole(workspaceId: string, memberUserId: string, role: WorkspaceRole, actorId: string) {
  if (role === WORKSPACE_ROLE.OWNER) {
    throw ApiError.badRequest(WORKSPACE_MESSAGES.OWNER_ROLE_LOCKED);
  }

  const membership = await Membership.findOne({ workspace: workspaceId, user: memberUserId });

  if (!membership) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.MEMBER_NOT_FOUND);
  }

  if (membership.role === WORKSPACE_ROLE.OWNER) {
    throw ApiError.badRequest(WORKSPACE_MESSAGES.OWNER_ROLE_LOCKED);
  }

  const previousRole = membership.role;
  membership.role = role;
  await membership.save();

  await Promise.all([forgetMembership(workspaceId, memberUserId), invalidateWorkspace(workspaceId)]);

  if (previousRole !== role) {
    await notify({
      recipients: [memberUserId],
      workspace: workspaceId,
      type: NOTIFICATION_TYPE.MEMBER_ROLE_CHANGED,
      message: `changed your role in ${await workspaceName(workspaceId)} from ${previousRole} to ${role}`,
      actor: actorId,
      link: appLink.members(workspaceId)
    });
  }

  return membership;
}

export async function removeMember(workspaceId: string, memberUserId: string, actorId: string) {
  const membership = await Membership.findOne({ workspace: workspaceId, user: memberUserId });

  if (!membership) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.MEMBER_NOT_FOUND);
  }

  if (membership.role === WORKSPACE_ROLE.OWNER) {
    throw ApiError.badRequest(WORKSPACE_MESSAGES.OWNER_CANNOT_LEAVE);
  }

  await withTransaction(async (session) => {
    await Membership.deleteOne({ _id: membership._id }, { session });
    await Workspace.updateOne({ _id: workspaceId }, { $inc: { memberCount: -1 } }, { session });
  });

  await Promise.all([forgetMembership(workspaceId, memberUserId), invalidateWorkspace(workspaceId)]);

  const name = await workspaceName(workspaceId);

  if (String(actorId) === String(memberUserId)) {
    const workspace = await Workspace.findById(workspaceId).select('owner').lean();

    await notify({
      recipients: workspace ? [String(workspace.owner)] : [],
      workspace: workspaceId,
      type: NOTIFICATION_TYPE.MEMBER_LEFT,
      message: `left ${name}`,
      actor: actorId,
      link: appLink.members(workspaceId)
    });
  } else {
    await notify({
      recipients: [memberUserId],
      workspace: workspaceId,
      type: NOTIFICATION_TYPE.MEMBER_REMOVED,
      message: `removed you from ${name}`,
      actor: actorId,
      link: appLink.home()
    });
  }

  return { removed: String(memberUserId) };
}

export async function transferOwnership(workspaceId: string, currentOwnerId: string, nextOwnerId: string) {
  const nextOwner = await Membership.findOne({ workspace: workspaceId, user: nextOwnerId });

  if (!nextOwner) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.MEMBER_NOT_FOUND);
  }

  await withTransaction(async (session) => {
    await Membership.updateOne(
      { workspace: workspaceId, user: currentOwnerId },
      { $set: { role: WORKSPACE_ROLE.ADMIN } },
      { session }
    );

    await Membership.updateOne(
      { workspace: workspaceId, user: nextOwnerId },
      { $set: { role: WORKSPACE_ROLE.OWNER } },
      { session }
    );

    await Workspace.updateOne({ _id: workspaceId }, { $set: { owner: nextOwnerId } }, { session });
  });

  await Promise.all([
    forgetMembership(workspaceId, currentOwnerId),
    forgetMembership(workspaceId, nextOwnerId),
    invalidateWorkspace(workspaceId)
  ]);

  await notify({
    recipients: [nextOwnerId],
    workspace: workspaceId,
    type: NOTIFICATION_TYPE.OWNERSHIP_TRANSFERRED,
    message: `made you the owner of ${await workspaceName(workspaceId)}`,
    actor: currentOwnerId,
    link: appLink.members(workspaceId)
  });

  return { workspace: String(workspaceId), owner: String(nextOwnerId) };
}

export async function leaveWorkspace(workspaceId: string, userId: string) {
  const membership = await Membership.findOne({ workspace: workspaceId, user: userId });

  if (!membership) {
    throw ApiError.notFound(WORKSPACE_MESSAGES.NOT_A_MEMBER);
  }

  if (membership.role === WORKSPACE_ROLE.OWNER) {
    throw ApiError.badRequest(WORKSPACE_MESSAGES.OWNER_CANNOT_LEAVE);
  }

  return removeMember(workspaceId, userId, userId);
}
