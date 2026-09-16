import { z } from 'zod';

import { email, objectId, paginationQuery, shortText } from './common.validator.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';

const assignableRoles = [WORKSPACE_ROLE.ADMIN, WORKSPACE_ROLE.MEMBER, WORKSPACE_ROLE.VIEWER];

export const createWorkspaceSchema = {
  body: z.object({
    name: shortText(80),
    description: z.string().trim().max(400).optional()
  })
};

export const workspaceParamsSchema = {
  params: z.object({ workspaceId: objectId })
};

export const memberParamsSchema = {
  params: z.object({ workspaceId: objectId, memberId: objectId })
};

export const updateWorkspaceSchema = {
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      name: shortText(80).optional(),
      description: z.string().trim().max(400).optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const listWorkspacesSchema = {
  query: paginationQuery
};

export const listMembersSchema = {
  params: z.object({ workspaceId: objectId }),
  query: paginationQuery
};

export const addMemberSchema = {
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    email,
    role: z.enum(assignableRoles).default(WORKSPACE_ROLE.MEMBER)
  })
};

export const updateMemberSchema = {
  params: z.object({ workspaceId: objectId, memberId: objectId }),
  body: z.object({ role: z.enum(assignableRoles) })
};

export const transferOwnershipSchema = {
  params: z.object({ workspaceId: objectId }),
  body: z.object({ memberId: objectId })
};

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema.body>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema.body>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesSchema.query>;
export type ListMembersQuery = z.infer<typeof listMembersSchema.query>;
export type AddMemberInput = z.infer<typeof addMemberSchema.body>;
