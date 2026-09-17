import asyncHandler from '../helpers/asyncHandler.js';
import { isSuperAdmin } from '../helpers/access.js';
import * as channelService from '../services/channel.service.js';
import { CHANNEL_MESSAGES, COMMON_MESSAGES } from '../constants/messages.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListChannelsQuery, ListMessagesQuery } from '../validators/channel.validator.js';

export const create = asyncHandler(async (req, res) => {
  const channel = await channelService.createChannel(req.workspaceId, req.auth.userId, req.body);

  res.created(channel, CHANNEL_MESSAGES.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await channelService.listChannels(
    req.workspaceId,
    req.auth.userId,
    validQuery<ListChannelsQuery>(req),
    isSuperAdmin(req.auth.role)
  );

  res.list(items, pagination);
});

export const detail = asyncHandler(async (req, res) => {
  const channel = await channelService.getChannel(
    req.workspaceId,
    req.params.channelId,
    req.auth.userId,
    isSuperAdmin(req.auth.role)
  );

  res.ok(channel, COMMON_MESSAGES.FETCHED);
});

export const update = asyncHandler(async (req, res) => {
  const channel = await channelService.updateChannel(
    req.workspaceId,
    req.params.channelId,
    req.auth.userId,
    req.body
  );

  res.ok(channel, CHANNEL_MESSAGES.UPDATED);
});

export const archive = asyncHandler(async (req, res) => {
  const result = await channelService.archiveChannel(req.workspaceId, req.params.channelId);

  res.ok(result, CHANNEL_MESSAGES.ARCHIVED);
});

export const join = asyncHandler(async (req, res) => {
  const result = await channelService.joinChannel(
    req.workspaceId,
    req.params.channelId,
    req.auth.userId,
    isSuperAdmin(req.auth.role)
  );

  res.ok(result, CHANNEL_MESSAGES.JOINED);
});

export const leave = asyncHandler(async (req, res) => {
  const result = await channelService.leaveChannel(req.workspaceId, req.params.channelId, req.auth.userId);

  res.ok(result, CHANNEL_MESSAGES.LEFT);
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await channelService.markRead(req.workspaceId, req.params.channelId, req.auth.userId);

  res.ok(result, CHANNEL_MESSAGES.READ);
});

export const messages = asyncHandler(async (req, res) => {
  const { items, cursor } = await channelService.listMessages(
    req.workspaceId,
    req.params.channelId,
    req.auth.userId,
    validQuery<ListMessagesQuery>(req),
    isSuperAdmin(req.auth.role)
  );

  res.list(items, cursor);
});

export const send = asyncHandler(async (req, res) => {
  const message = await channelService.sendMessage(
    req.workspaceId,
    req.params.channelId,
    req.auth.userId,
    req.body
  );

  res.created(message, CHANNEL_MESSAGES.MESSAGE_SENT);
});

export const edit = asyncHandler(async (req, res) => {
  const message = await channelService.editMessage(
    req.workspaceId,
    req.params.channelId,
    req.params.messageId,
    req.auth.userId,
    req.body.body
  );

  res.ok(message, CHANNEL_MESSAGES.MESSAGE_UPDATED);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await channelService.deleteMessage(
    req.workspaceId,
    req.params.channelId,
    req.params.messageId,
    req.auth.userId
  );

  res.ok(result, CHANNEL_MESSAGES.MESSAGE_DELETED);
});

export const react = asyncHandler(async (req, res) => {
  const message = await channelService.toggleReaction(
    req.workspaceId,
    req.params.channelId,
    req.params.messageId,
    req.auth.userId,
    req.body.emoji
  );

  res.ok(message, CHANNEL_MESSAGES.REACTION_UPDATED);
});
