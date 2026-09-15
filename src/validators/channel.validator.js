import { z } from 'zod';

import { objectId, paginationQuery, shortText } from './common.validator.js';
import { ALLOWED_REACTIONS, CHANNEL_VISIBILITY, MESSAGE_PAGE_SIZE } from '../constants/channel.js';

const workspaceParams = { workspaceId: objectId };
const channelParams = { ...workspaceParams, channelId: objectId };

export const createChannelSchema = {
  params: z.object(workspaceParams),
  body: z.object({
    name: shortText(60),
    topic: z.string().trim().max(200).optional(),
    visibility: z.enum(Object.values(CHANNEL_VISIBILITY)).default(CHANNEL_VISIBILITY.PUBLIC)
  })
};

export const listChannelsSchema = {
  params: z.object(workspaceParams),
  query: paginationQuery.extend({
    mine: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
  })
};

export const channelParamsSchema = {
  params: z.object(channelParams)
};

export const updateChannelSchema = {
  params: z.object(channelParams),
  body: z
    .object({
      name: shortText(60).optional(),
      topic: z.string().trim().max(200).optional(),
      visibility: z.enum(Object.values(CHANNEL_VISIBILITY)).optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const listMessagesSchema = {
  params: z.object(channelParams),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(MESSAGE_PAGE_SIZE),
    before: objectId.optional(),
    parent: objectId.optional()
  })
};

export const sendMessageSchema = {
  params: z.object(channelParams),
  body: z.object({
    body: z.string().trim().min(1).max(4000),
    parent: objectId.optional(),
    mentions: z.array(objectId).max(20).optional(),
    attachments: z.array(objectId).max(10).optional()
  })
};

export const messageParamsSchema = {
  params: z.object({ ...channelParams, messageId: objectId })
};

export const editMessageSchema = {
  params: z.object({ ...channelParams, messageId: objectId }),
  body: z.object({ body: z.string().trim().min(1).max(4000) })
};

export const reactionSchema = {
  params: z.object({ ...channelParams, messageId: objectId }),
  body: z.object({ emoji: z.enum(ALLOWED_REACTIONS) })
};
