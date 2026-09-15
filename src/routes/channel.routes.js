import { Router } from 'express';

import * as channelController from '../controllers/channel.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { writeLimiter } from '../middlewares/rateLimiter.js';
import {
  channelParamsSchema,
  createChannelSchema,
  editMessageSchema,
  listChannelsSchema,
  listMessagesSchema,
  messageParamsSchema,
  reactionSchema,
  sendMessageSchema,
  updateChannelSchema
} from '../validators/channel.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);
const writer = requireWorkspaceRole(WORKSPACE_ROLE.MEMBER);
const manager = requireWorkspaceRole(WORKSPACE_ROLE.ADMIN);

router.use(authenticate);

router.post('/', writeLimiter, validate(createChannelSchema), writer, channelController.create);
router.get('/', validate(listChannelsSchema), reader, channelController.list);

router.get('/:channelId', validate(channelParamsSchema), reader, channelController.detail);
router.patch('/:channelId', writeLimiter, validate(updateChannelSchema), writer, channelController.update);
router.delete('/:channelId', validate(channelParamsSchema), manager, channelController.archive);

router.post('/:channelId/join', validate(channelParamsSchema), writer, channelController.join);
router.post('/:channelId/leave', validate(channelParamsSchema), reader, channelController.leave);
router.post('/:channelId/read', validate(channelParamsSchema), reader, channelController.markRead);

router.get('/:channelId/messages', validate(listMessagesSchema), reader, channelController.messages);
router.post('/:channelId/messages', writeLimiter, validate(sendMessageSchema), writer, channelController.send);
router.patch(
  '/:channelId/messages/:messageId',
  writeLimiter,
  validate(editMessageSchema),
  writer,
  channelController.edit
);
router.delete('/:channelId/messages/:messageId', validate(messageParamsSchema), writer, channelController.remove);
router.post(
  '/:channelId/messages/:messageId/reactions',
  writeLimiter,
  validate(reactionSchema),
  writer,
  channelController.react
);

export default router;
