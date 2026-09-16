import { z } from 'zod';

import { objectId, paginationQuery, shortText } from './common.validator.js';
import { CARD_PRIORITY } from '../constants/board.js';

const workspaceParams = { workspaceId: objectId };
const boardParams = { ...workspaceParams, boardId: objectId };

const label = z.string().trim().min(1).max(24);

export const createBoardSchema = {
  params: z.object(workspaceParams),
  body: z.object({
    name: shortText(120),
    description: z.string().trim().max(400).optional(),
    colour: z.string().trim().max(24).optional()
  })
};

export const listBoardsSchema = {
  params: z.object(workspaceParams),
  query: paginationQuery
};

export const boardParamsSchema = {
  params: z.object(boardParams)
};

export const updateBoardSchema = {
  params: z.object(boardParams),
  body: z
    .object({
      name: shortText(120).optional(),
      description: z.string().trim().max(400).optional(),
      colour: z.string().trim().max(24).optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const createListSchema = {
  params: z.object(boardParams),
  body: z.object({
    name: shortText(80),
    cardLimit: z.coerce.number().int().min(1).max(500).nullable().optional()
  })
};

export const listParamsSchema = {
  params: z.object({ ...boardParams, listId: objectId })
};

export const updateListSchema = {
  params: z.object({ ...boardParams, listId: objectId }),
  body: z
    .object({
      name: shortText(80).optional(),
      cardLimit: z.coerce.number().int().min(1).max(500).nullable().optional(),
      position: z.coerce.number().int().min(0).optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const createCardSchema = {
  params: z.object(boardParams),
  body: z.object({
    list: objectId,
    title: shortText(200),
    description: z.string().trim().max(8000).optional(),
    priority: z.enum(CARD_PRIORITY).optional(),
    labels: z.array(label).max(10).optional(),
    assignees: z.array(objectId).max(20).optional(),
    dueAt: z.coerce.date().optional()
  })
};

export const cardParamsSchema = {
  params: z.object({ ...boardParams, cardId: objectId })
};

export const updateCardSchema = {
  params: z.object({ ...boardParams, cardId: objectId }),
  body: z
    .object({
      title: shortText(200).optional(),
      description: z.string().trim().max(8000).optional(),
      priority: z.enum(CARD_PRIORITY).optional(),
      labels: z.array(label).max(10).optional(),
      assignees: z.array(objectId).max(20).optional(),
      dueAt: z.coerce.date().nullable().optional(),
      completed: z.boolean().optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const moveCardSchema = {
  params: z.object({ ...boardParams, cardId: objectId }),
  body: z.object({
    list: objectId.optional(),
    position: z.coerce.number().int().min(0).optional()
  })
};

export const listCardsSchema = {
  params: z.object(boardParams),
  query: paginationQuery.extend({
    list: objectId.optional(),
    assignee: objectId.optional(),
    label: label.optional(),
    priority: z.enum(CARD_PRIORITY).optional(),
    overdue: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
  })
};

export type CreateBoardInput = z.infer<typeof createBoardSchema.body>;
export type ListBoardsQuery = z.infer<typeof listBoardsSchema.query>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema.body>;
export type CreateListInput = z.infer<typeof createListSchema.body>;
export type UpdateListInput = z.infer<typeof updateListSchema.body>;
export type CreateCardInput = z.infer<typeof createCardSchema.body>;
export type UpdateCardInput = z.infer<typeof updateCardSchema.body>;
export type MoveCardInput = z.infer<typeof moveCardSchema.body>;
export type ListCardsQuery = z.infer<typeof listCardsSchema.query>;
