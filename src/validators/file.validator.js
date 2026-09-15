import { z } from 'zod';

import { objectId, paginationQuery } from './common.validator.js';
import { AUDIT_ENTITY } from '../constants/audit.js';

export const uploadSchema = {
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    entityType: z.enum(Object.values(AUDIT_ENTITY)).optional(),
    entityId: objectId.optional()
  })
};

export const listFilesSchema = {
  params: z.object({ workspaceId: objectId }),
  query: paginationQuery.extend({ entityType: z.enum(Object.values(AUDIT_ENTITY)).optional() })
};

export const fileParamsSchema = {
  params: z.object({ workspaceId: objectId, fileId: objectId })
};

export const usageSchema = {
  params: z.object({ workspaceId: objectId })
};
