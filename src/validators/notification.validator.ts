import { z } from 'zod';

import { objectId, paginationQuery } from './common.validator.js';

export const listNotificationsSchema = {
  query: paginationQuery.extend({
    workspace: objectId.optional(),
    unread: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
  })
};

export const notificationParamsSchema = {
  params: z.object({ notificationId: objectId })
};

export const markAllReadSchema = {
  body: z.object({ workspace: objectId.optional() })
};

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema.query>;
