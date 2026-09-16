import { z } from 'zod';

import { objectId, paginationQuery, shortText } from './common.validator.js';

const workspaceParams = { workspaceId: objectId };
const pageParams = { ...workspaceParams, pageId: objectId };

export const createPageSchema = {
  params: z.object(workspaceParams),
  body: z.object({
    title: shortText(160),
    body: z.string().max(100000).optional(),
    icon: z.string().max(16).optional(),
    parent: objectId.nullable().optional()
  })
};

export const listPagesSchema = {
  params: z.object(workspaceParams),
  query: paginationQuery.extend({ parent: objectId.optional() })
};

export const treeSchema = {
  params: z.object(workspaceParams)
};

export const pageParamsSchema = {
  params: z.object(pageParams)
};

export const updatePageSchema = {
  params: z.object(pageParams),
  body: z
    .object({
      title: shortText(160).optional(),
      body: z.string().max(100000).optional(),
      icon: z.string().max(16).nullable().optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const movePageSchema = {
  params: z.object(pageParams),
  body: z.object({
    parent: objectId.nullable().optional(),
    position: z.coerce.number().int().min(0).optional()
  })
};

export const reorderPagesSchema = {
  params: z.object(workspaceParams),
  body: z.object({
    entries: z
      .array(z.object({ page: objectId, position: z.coerce.number().int().min(0) }))
      .min(1)
      .max(200)
  })
};

export const listRevisionsSchema = {
  params: z.object(pageParams),
  query: paginationQuery
};

export const restoreRevisionSchema = {
  params: z.object({ ...pageParams, version: z.coerce.number().int().positive() })
};

export type CreatePageInput = z.infer<typeof createPageSchema.body>;
export type ListPagesQuery = z.infer<typeof listPagesSchema.query>;
export type UpdatePageInput = z.infer<typeof updatePageSchema.body>;
export type MovePageInput = z.infer<typeof movePageSchema.body>;
export type ReorderPagesInput = z.infer<typeof reorderPagesSchema.body>;
export type ListRevisionsQuery = z.infer<typeof listRevisionsSchema.query>;
