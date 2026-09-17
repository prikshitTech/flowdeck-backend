
import ApiError from '../helpers/apiError.js';
import Channel from '../models/channel.model.js';
import ChannelMember from '../models/channelMember.model.js';
import Membership from '../models/membership.model.js';
import Message from '../models/message.model.js';
import { ALLOWED_REACTIONS, CHANNEL_VISIBILITY } from '../constants/channel.js';
import { CHANNEL_MESSAGES } from '../constants/messages.js';
import { dropByPrefix } from './cache.service.js';
import { cacheKey } from '../constants/cacheKeys.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { emitToChannel } from '../sockets/emitter.js';
import { AUDIT_ENTITY } from '../constants/audit.js';
import { NOTIFICATION_TYPE, appLink } from '../constants/notifications.js';
import { notify } from './notification.service.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import { slugify } from '../helpers/slug.js';
import { withId, withIds } from '../helpers/present.js';
import { withTransaction } from '../helpers/transaction.js';
import type { Id } from '../helpers/objectId.js';
import type {
  CreateChannelInput,
  ListChannelsQuery,
  ListMessagesQuery,
  SendMessageInput,
  UpdateChannelInput
} from '../validators/channel.validator.js';
import { toObjectId } from '../helpers/objectId.js';

type Match = Record<string, unknown>;

function invalidate(workspaceId: string) {
  return dropByPrefix(cacheKey.workspaceTag(workspaceId));
}

async function loadChannel(workspaceId: string, channelId: string) {
  const channel = await Channel.findOne({ _id: channelId, workspace: workspaceId, archivedAt: null });

  if (!channel) {
    throw ApiError.notFound(CHANNEL_MESSAGES.NOT_FOUND);
  }

  return channel;
}

export async function assertCanRead(workspaceId: string, channelId: string, userId: string, unrestricted = false) {
  const channel = await loadChannel(workspaceId, channelId);
  const membership = await ChannelMember.findOne({ channel: channel._id, user: userId }).lean();

  if (channel.visibility === CHANNEL_VISIBILITY.PRIVATE && !membership && !unrestricted) {
    throw ApiError.forbidden(CHANNEL_MESSAGES.PRIVATE_ACCESS);
  }

  return { channel, membership };
}

async function assertCanPost(workspaceId: string, channelId: string, userId: string, unrestricted = false) {
  const { channel, membership } = await assertCanRead(workspaceId, channelId, userId, unrestricted);

  if (!membership) {
    throw ApiError.forbidden(CHANNEL_MESSAGES.NOT_JOINED);
  }

  return { channel, membership };
}

export async function createChannel(workspaceId: string, authorId: string, payload: CreateChannelInput) {
  const slug = slugify(payload.name);
  const taken = await Channel.exists({ workspace: workspaceId, slug });

  if (taken) {
    throw ApiError.conflict(CHANNEL_MESSAGES.NAME_TAKEN);
  }

  const channel = await withTransaction(async (session) => {
    const [created] = await Channel.create(
      [{ ...payload, slug, workspace: workspaceId, createdBy: authorId, memberCount: 1 }],
      { session }
    );

    await ChannelMember.create(
      [{ channel: created._id, workspace: workspaceId, user: authorId, lastReadAt: new Date() }],
      { session }
    );

    return created;
  });

  await invalidate(workspaceId);
  return channel;
}

export async function listChannels(
  workspaceId: string,
  userId: string,
  query: ListChannelsQuery,
  unrestricted = false
) {
  const match: Match = { workspace: toObjectId(workspaceId), archivedAt: null };

  if (query.mine) {
    const joined = await ChannelMember.find({ workspace: workspaceId, user: userId }).select('channel').lean();
    match._id = { $in: joined.map((row) => row.channel) };
  } else if (!unrestricted) {
    match.$or = [
      { visibility: CHANNEL_VISIBILITY.PUBLIC },
      { _id: { $in: await joinedChannelIds(workspaceId, userId) } }
    ];
  }

  const result = await Channel.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'channelmembers',
        let: { channelId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$channel', '$$channelId'] }, { $eq: ['$user', toObjectId(userId)] }] } } },
          { $project: { _id: 0, lastReadAt: 1, muted: 1 } }
        ],
        as: 'mine'
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        slug: 1,
        topic: 1,
        visibility: 1,
        memberCount: 1,
        messageCount: 1,
        lastMessageAt: 1,
        joined: { $gt: [{ $size: '$mine' }, 0] },
        lastReadAt: { $first: '$mine.lastReadAt' },
        muted: { $ifNull: [{ $first: '$mine.muted' }, false] }
      }
    },
    { $sort: { lastMessageAt: sortDirection(query.sort), name: 1 } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

async function joinedChannelIds(workspaceId: string, userId: string) {
  const rows = await ChannelMember.find({ workspace: workspaceId, user: userId }).select('channel').lean();
  return rows.map((row) => row.channel);
}

export async function getChannel(workspaceId: string, channelId: string, userId: string, unrestricted = false) {
  const { channel, membership } = await assertCanRead(workspaceId, channelId, userId, unrestricted);
  const unread = membership?.lastReadAt
    ? await Message.countDocuments({
        channel: channel._id,
        deletedAt: null,
        createdAt: { $gt: membership.lastReadAt }
      })
    : channel.messageCount;

  return { ...channel.toJSON(), joined: Boolean(membership), unread };
}

export async function updateChannel(workspaceId: string, channelId: string, userId: string, payload: UpdateChannelInput) {
  await assertCanPost(workspaceId, channelId, userId);

  const channel = await Channel.findOneAndUpdate(
    { _id: channelId, workspace: workspaceId },
    { $set: payload },
    { returnDocument: 'after', runValidators: true }
  );

  await invalidate(workspaceId);
  return channel;
}

export async function archiveChannel(workspaceId: string, channelId: string) {
  const channel = await loadChannel(workspaceId, channelId);

  channel.archivedAt = new Date();
  await channel.save();

  await invalidate(workspaceId);
  return { archived: String(channel._id) };
}

export async function joinChannel(workspaceId: string, channelId: string, userId: string, unrestricted = false) {
  const channel = await loadChannel(workspaceId, channelId);

  if (channel.visibility === CHANNEL_VISIBILITY.PRIVATE && !unrestricted) {
    throw ApiError.forbidden(CHANNEL_MESSAGES.PRIVATE_ACCESS);
  }

  const already = await ChannelMember.exists({ channel: channel._id, user: userId });

  if (already) {
    throw ApiError.conflict(CHANNEL_MESSAGES.ALREADY_JOINED);
  }

  await withTransaction(async (session) => {
    await ChannelMember.create(
      [{ channel: channel._id, workspace: workspaceId, user: userId, lastReadAt: new Date() }],
      { session }
    );

    await Channel.updateOne({ _id: channel._id }, { $inc: { memberCount: 1 } }, { session });
  });

  await invalidate(workspaceId);
  return { channel: String(channel._id), joined: true };
}

export async function leaveChannel(workspaceId: string, channelId: string, userId: string) {
  const channel = await loadChannel(workspaceId, channelId);
  const membership = await ChannelMember.findOne({ channel: channel._id, user: userId });

  if (!membership) {
    throw ApiError.badRequest(CHANNEL_MESSAGES.NOT_JOINED);
  }

  await withTransaction(async (session) => {
    await ChannelMember.deleteOne({ _id: membership._id }, { session });
    await Channel.updateOne({ _id: channel._id }, { $inc: { memberCount: -1 } }, { session });
  });

  await invalidate(workspaceId);
  return { channel: String(channel._id), joined: false };
}

export async function markRead(workspaceId: string, channelId: string, userId: string) {
  const { channel } = await assertCanPost(workspaceId, channelId, userId);

  await ChannelMember.updateOne(
    { channel: channel._id, user: userId },
    { $set: { lastReadAt: new Date() } }
  );

  return { channel: String(channel._id), unread: 0 };
}

export async function listMessages(
  workspaceId: string,
  channelId: string,
  userId: string,
  query: ListMessagesQuery,
  unrestricted = false
) {
  const { channel } = await assertCanRead(workspaceId, channelId, userId, unrestricted);

  const filter: Match = { channel: channel._id, deletedAt: null, parent: query.parent ?? null };

  if (query.before) {
    filter._id = { $lt: toObjectId(query.before) };
  }

  const rows = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .populate('author', 'name email avatarUrl')
    .lean();

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items: withIds(page).reverse(),
    cursor: { hasMore, next: hasMore ? String(page[page.length - 1]._id) : null }
  };
}

export async function sendMessage(workspaceId: string, channelId: string, authorId: string, payload: SendMessageInput) {
  const { channel } = await assertCanPost(workspaceId, channelId, authorId);

  if (payload.mentions?.length) {
    const members = await Membership.countDocuments({
      workspace: workspaceId,
      user: { $in: payload.mentions }
    });

    if (members !== new Set(payload.mentions.map(String)).size) {
      throw ApiError.badRequest('Mentions must be workspace members');
    }
  }

  const message = await withTransaction(async (session) => {
    const [created] = await Message.create(
      [{ ...payload, channel: channel._id, workspace: workspaceId, author: authorId }],
      { session }
    );

    await Channel.updateOne(
      { _id: channel._id },
      { $inc: { messageCount: 1 }, $set: { lastMessageAt: created.createdAt } },
      { session }
    );

    if (payload.parent) {
      await Message.updateOne({ _id: payload.parent }, { $inc: { replyCount: 1 } }, { session });
    }

    return created;
  });

  await message.populate('author', 'name email avatarUrl');
  await invalidate(workspaceId);

  emitToChannel(channel._id, SOCKET_EVENT.MESSAGE_CREATED, message.toJSON());

  if (message.mentions.length > 0) {
    await notify({
      recipients: message.mentions.map(String),
      workspace: workspaceId,
      type: NOTIFICATION_TYPE.MENTION,
      message: `mentioned you in #${channel.name}`,
      body: message.body,
      actor: authorId,
      entityType: AUDIT_ENTITY.MESSAGE,
      entityId: String(message._id),
      link: appLink.channel(workspaceId, String(channel._id))
    });
  }

  return message;
}

async function loadOwnMessage(channelId: Id, messageId: string, userId: string) {
  const message = await Message.findOne({ _id: messageId, channel: channelId, deletedAt: null });

  if (!message) {
    throw ApiError.notFound(CHANNEL_MESSAGES.MESSAGE_NOT_FOUND);
  }

  if (String(message.author) !== String(userId)) {
    throw ApiError.forbidden(CHANNEL_MESSAGES.NOT_MESSAGE_AUTHOR);
  }

  return message;
}

export async function editMessage(workspaceId: string, channelId: string, messageId: string, userId: string, body: string) {
  const { channel } = await assertCanPost(workspaceId, channelId, userId);
  const message = await loadOwnMessage(channel._id, messageId, userId);

  message.set({ body, editedAt: new Date() });
  await message.save();

  emitToChannel(channel._id, SOCKET_EVENT.MESSAGE_UPDATED, message.toJSON());

  return message;
}

export async function deleteMessage(workspaceId: string, channelId: string, messageId: string, userId: string) {
  const { channel } = await assertCanPost(workspaceId, channelId, userId);
  const message = await loadOwnMessage(channel._id, messageId, userId);

  await withTransaction(async (session) => {
    message.set({ deletedAt: new Date(), body: '' });
    await message.save({ session });

    await Channel.updateOne({ _id: channel._id }, { $inc: { messageCount: -1 } }, { session });

    if (message.parent) {
      await Message.updateOne({ _id: message.parent }, { $inc: { replyCount: -1 } }, { session });
    }
  });

  emitToChannel(channel._id, SOCKET_EVENT.MESSAGE_DELETED, { id: String(message._id) });

  return { deleted: String(message._id) };
}

export async function toggleReaction(workspaceId: string, channelId: string, messageId: string, userId: string, emoji: string) {
  const allowed: readonly string[] = ALLOWED_REACTIONS;

  if (!allowed.includes(emoji)) {
    throw ApiError.badRequest(`Reaction must be one of ${ALLOWED_REACTIONS.join(', ')}`);
  }

  const { channel } = await assertCanPost(workspaceId, channelId, userId);
  const message = await Message.findOne({ _id: messageId, channel: channel._id, deletedAt: null });

  if (!message) {
    throw ApiError.notFound(CHANNEL_MESSAGES.MESSAGE_NOT_FOUND);
  }

  const existing = message.reactions.find((reaction) => reaction.emoji === emoji);

  if (!existing) {
    message.reactions.push({ emoji, users: [toObjectId(userId)] });
  } else if (existing.users.some((id) => String(id) === String(userId))) {
    existing.users = existing.users.filter((id) => String(id) !== String(userId));
  } else {
    existing.users.push(toObjectId(userId));
  }

  message.set('reactions', message.reactions.filter((reaction) => reaction.users.length > 0));
  await message.save();

  const payload = withId(message.toObject());
  emitToChannel(channel._id, SOCKET_EVENT.REACTION_UPDATED, payload);

  return payload;
}
