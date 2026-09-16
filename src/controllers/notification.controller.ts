import asyncHandler from '../helpers/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';
import { COMMON_MESSAGES, NOTIFICATION_MESSAGES } from '../constants/messages.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await notificationService.listNotifications(req.auth.userId, validQuery<ListNotificationsQuery>(req));

  res.list(items, pagination);
});

export const unread = asyncHandler(async (req, res) => {
  const counts = await notificationService.unreadCount(req.auth.userId);

  res.ok(counts, COMMON_MESSAGES.FETCHED);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.auth.userId, req.params.notificationId);

  res.ok(notification, NOTIFICATION_MESSAGES.MARKED_READ);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.auth.userId, req.body.workspace);

  res.ok(result, NOTIFICATION_MESSAGES.ALL_MARKED_READ);
});
