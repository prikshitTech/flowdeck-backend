import asyncHandler from '../helpers/asyncHandler.js';
import * as workspaceService from '../services/workspace.service.js';
import { COMMON_MESSAGES, WORKSPACE_MESSAGES } from '../constants/messages.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListMembersQuery, ListWorkspacesQuery } from '../validators/workspace.validator.js';

export const create = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(req.auth.userId, req.body);

  res.created(workspace, WORKSPACE_MESSAGES.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await workspaceService.listWorkspaces(req.auth.userId, validQuery<ListWorkspacesQuery>(req));

  res.list(items, pagination);
});

export const detail = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspace(req.workspaceId);

  res.ok({ ...workspace, role: req.membership.role }, COMMON_MESSAGES.FETCHED);
});

export const update = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(req.workspaceId, req.body);

  res.ok(workspace, WORKSPACE_MESSAGES.UPDATED);
});

export const archive = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.archiveWorkspace(req.workspaceId);

  res.ok(workspace, WORKSPACE_MESSAGES.ARCHIVED);
});

export const members = asyncHandler(async (req, res) => {
  const { items, pagination } = await workspaceService.listMembers(req.workspaceId, validQuery<ListMembersQuery>(req));

  res.list(items, pagination);
});

export const addMember = asyncHandler(async (req, res) => {
  const result = await workspaceService.addMember(req.workspaceId, req.auth.userId, req.body);

  res.created(result, WORKSPACE_MESSAGES.MEMBER_ADDED);
});

export const updateMember = asyncHandler(async (req, res) => {
  const membership = await workspaceService.updateMemberRole(req.workspaceId, req.params.memberId, req.body.role);

  res.ok(membership, WORKSPACE_MESSAGES.MEMBER_UPDATED);
});

export const removeMember = asyncHandler(async (req, res) => {
  const result = await workspaceService.removeMember(req.workspaceId, req.params.memberId);

  res.ok(result, WORKSPACE_MESSAGES.MEMBER_REMOVED);
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const result = await workspaceService.transferOwnership(req.workspaceId, req.auth.userId, req.body.memberId);

  res.ok(result, WORKSPACE_MESSAGES.OWNERSHIP_TRANSFERRED);
});

export const leave = asyncHandler(async (req, res) => {
  const result = await workspaceService.leaveWorkspace(req.workspaceId, req.auth.userId);

  res.ok(result, WORKSPACE_MESSAGES.MEMBER_REMOVED);
});
