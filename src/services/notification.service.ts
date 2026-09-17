import ApiError from '../helpers/apiError.js';
import Card from '../models/card.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { AUDIT_ENTITY } from '../constants/audit.js';
import { JOB, QUEUE } from '../constants/queues.js';
import { NOTIFICATION_MESSAGES } from '../constants/messages.js';
import { NOTIFICATION_TYPE, appLink, type NotificationType } from '../constants/notifications.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { emitToUser } from '../sockets/emitter.js';
import { enqueue } from '../queues/index.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import { toObjectId, type Id } from '../helpers/objectId.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

type Match = Record<string, unknown>;

const PREVIEW_LENGTH = 140;

export interface NotificationDraft {
  recipients: Id[];
  workspace: Id;
  type: NotificationType;
  message: string;
  body?: string;
  actor?: Id | null;
  entityType?: string | null;
  entityId?: Id | null;
  link?: string | null;
}

function preview(text: string): string {
  const trimmed = text.trim();

  return trimmed.length > PREVIEW_LENGTH ? `${trimmed.slice(0, PREVIEW_LENGTH)}...` : trimmed;
}

async function actorName(actor: string | null): Promise<string | null> {
  if (!actor) {
    return null;
  }

  const user = await User.findById(actor).select('name').lean();
  return user?.name ?? 'Someone';
}

export async function deliver(draft: NotificationDraft) {
  const actor = draft.actor ? String(draft.actor) : null;
  const recipients = [...new Set(draft.recipients.map(String))].filter((userId) => userId !== actor);

  if (recipients.length === 0) {
    return [];
  }

  const name = await actorName(actor);
  const title = name ? `${name} ${draft.message}` : draft.message;

  const created = await Notification.insertMany(
    recipients.map((userId) => ({
      user: userId,
      workspace: draft.workspace,
      type: draft.type,
      title,
      body: preview(draft.body ?? ''),
      entityType: draft.entityType ?? null,
      entityId: draft.entityId ?? null,
      actor,
      link: draft.link ?? null
    }))
  );

  for (const notification of created) {
    emitToUser(notification.user, SOCKET_EVENT.NOTIFICATION_CREATED, { ...notification.toJSON(), actor: name });
  }

  return created;
}

export function notify(draft: NotificationDraft): Promise<boolean> {
  const payload: NotificationDraft = {
    ...draft,
    recipients: draft.recipients.map(String),
    workspace: String(draft.workspace),
    actor: draft.actor ? String(draft.actor) : null,
    entityId: draft.entityId ? String(draft.entityId) : null
  };

  return enqueue(QUEUE.NOTIFICATION, JOB.DELIVER_NOTIFICATION, payload, { runInline: deliver });
}

export async function remindDueCards() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await Card.find({
    dueAt: { $gte: now, $lte: horizon },
    completedAt: null,
    archivedAt: null,
    assignees: { $ne: [] }
  })
    .select('title workspace board assignees dueAt')
    .lean();

  let delivered = 0;

  for (const card of due) {
    const created = await deliver({
      recipients: card.assignees,
      workspace: card.workspace,
      type: NOTIFICATION_TYPE.CARD_DUE_SOON,
      message: `"${card.title}" is due within a day`,
      body: card.title,
      entityType: AUDIT_ENTITY.CARD,
      entityId: card._id,
      link: appLink.board(String(card.workspace), String(card.board))
    });

    delivered += created.length;
  }

  return { cards: due.length, notifications: delivered };
}

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const match: Match = { user: toObjectId(userId) };

  if (query.workspace) {
    match.workspace = toObjectId(query.workspace);
  }

  if (query.unread) {
    match.readAt = null;
  }

  const result = await Notification.aggregate([
    { $match: match },
    { $lookup: { from: 'users', localField: 'actor', foreignField: '_id', as: 'person' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        type: 1,
        title: 1,
        body: 1,
        entityType: 1,
        entityId: 1,
        workspace: 1,
        link: 1,
        readAt: 1,
        createdAt: 1,
        actor: { $first: '$person.name' }
      }
    },
    { $sort: { createdAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function unreadCount(userId: string) {
  const counts = await Notification.aggregate([
    { $match: { user: toObjectId(userId), readAt: null } },
    { $group: { _id: '$workspace', count: { $sum: 1 } } },
    { $project: { _id: 0, workspace: '$_id', count: 1 } }
  ]);

  return { total: counts.reduce((sum, row) => sum + row.count, 0), byWorkspace: counts };
}

export async function markRead(userId: string, notificationId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!notification) {
    throw ApiError.notFound(NOTIFICATION_MESSAGES.NOT_FOUND);
  }

  return notification;
}

export async function markAllRead(userId: string, workspaceId?: string) {
  const filter: Match = { user: userId, readAt: null };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });

  return { read: result.modifiedCount };
}
