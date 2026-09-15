import mongoose from 'mongoose';

import ApiError from '../helpers/apiError.js';
import Card from '../models/card.model.js';
import Message from '../models/message.model.js';
import Notification from '../models/notification.model.js';
import { AUDIT_ENTITY } from '../constants/audit.js';
import { NOTIFICATION_MESSAGES } from '../constants/messages.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { emitToUser } from '../sockets/emitter.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const PREVIEW_LENGTH = 140;

function preview(text) {
  const trimmed = text.trim();

  return trimmed.length > PREVIEW_LENGTH ? `${trimmed.slice(0, PREVIEW_LENGTH)}...` : trimmed;
}

async function deliver(entries) {
  const targets = entries.filter((entry) => String(entry.user) !== String(entry.actor));

  if (targets.length === 0) {
    return [];
  }

  const created = await Notification.insertMany(targets);

  for (const notification of created) {
    emitToUser(notification.user, SOCKET_EVENT.NOTIFICATION_CREATED, notification.toJSON());
  }

  return created;
}

export async function fanOutMention({ messageId }) {
  const message = await Message.findById(messageId).populate('author', 'name').lean();

  if (!message || message.mentions.length === 0) {
    return [];
  }

  return deliver(
    message.mentions.map((userId) => ({
      user: userId,
      workspace: message.workspace,
      type: 'mention',
      title: `${message.author.name} mentioned you`,
      body: preview(message.body),
      entityType: AUDIT_ENTITY.MESSAGE,
      entityId: message._id,
      actor: message.author._id
    }))
  );
}

export async function fanOutAssignment({ cardId, actorId, assignees }) {
  const card = await Card.findById(cardId).lean();

  if (!card || !assignees?.length) {
    return [];
  }

  return deliver(
    assignees.map((userId) => ({
      user: userId,
      workspace: card.workspace,
      type: 'card_assigned',
      title: 'You were assigned a card',
      body: preview(card.title),
      entityType: AUDIT_ENTITY.CARD,
      entityId: card._id,
      actor: actorId
    }))
  );
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
    .select('title workspace assignees dueAt')
    .lean();

  const entries = due.flatMap((card) =>
    card.assignees.map((userId) => ({
      user: userId,
      workspace: card.workspace,
      type: 'card_due_soon',
      title: 'A card is due soon',
      body: preview(card.title),
      entityType: AUDIT_ENTITY.CARD,
      entityId: card._id,
      actor: null
    }))
  );

  const created = await deliver(entries);
  return { cards: due.length, notifications: created.length };
}

export async function listNotifications(userId, query) {
  const match = { user: toObjectId(userId) };

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

export async function unreadCount(userId) {
  const counts = await Notification.aggregate([
    { $match: { user: toObjectId(userId), readAt: null } },
    { $group: { _id: '$workspace', count: { $sum: 1 } } },
    { $project: { _id: 0, workspace: '$_id', count: 1 } }
  ]);

  return { total: counts.reduce((sum, row) => sum + row.count, 0), byWorkspace: counts };
}

export async function markRead(userId, notificationId) {
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

export async function markAllRead(userId, workspaceId) {
  const filter = { user: userId, readAt: null };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });

  return { read: result.modifiedCount };
}
