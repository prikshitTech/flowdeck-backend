import { z } from 'zod';

import { objectId, paginationQuery } from './common.validator.js';

const KINDS: string[] = ['page', 'card', 'message'];

export const searchSchema = {
  params: z.object({ workspaceId: objectId }),
  query: paginationQuery.extend({
    q: z.string().trim().min(2, 'Search needs at least two characters').max(120),
    kinds: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',').map((kind) => kind.trim()) : undefined))
      .refine((value) => !value || value.every((kind) => KINDS.includes(kind)), {
        message: `kinds must be any of ${KINDS.join(', ')}`
      })
  })
};

export const suggestSchema = {
  params: z.object({ workspaceId: objectId }),
  query: z.object({ q: z.string().trim().min(1).max(60) })
};

export const overviewSchema = {
  params: z.object({ workspaceId: objectId }),
  query: z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })
};

export const boardAnalyticsSchema = {
  params: z.object({ workspaceId: objectId, boardId: objectId })
};

export type SearchQuery = z.infer<typeof searchSchema.query>;
