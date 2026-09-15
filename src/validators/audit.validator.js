import { z } from 'zod';

import { objectId, paginationQuery } from './common.validator.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../constants/audit.js';

export const listAuditSchema = {
  params: z.object({ workspaceId: objectId }),
  query: paginationQuery.extend({
    action: z.enum(Object.values(AUDIT_ACTION)).optional(),
    entityType: z.enum(Object.values(AUDIT_ENTITY)).optional(),
    actor: objectId.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional()
  })
};

export const auditSummarySchema = {
  params: z.object({ workspaceId: objectId }),
  query: z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })
};
