import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

import Board from '../models/board.model.js';
import logger from '../config/logger.js';
import { ROOM, SOCKET_EVENT } from '../constants/events.js';
import { assertCanRead } from '../services/channel.service.js';
import { bindRealtime } from './emitter.js';
import { corsOrigins } from '../config/env.js';
import { createRedisClient } from '../config/redis.js';
import { loadMembership } from '../middlewares/workspaceAccess.js';
import { resolveAccessToken } from '../services/identity.service.js';

const PING_INTERVAL_MS = 25000;

function handshakeToken(socket) {
  const fromAuth = socket.handshake.auth?.token;
  const fromHeader = socket.handshake.headers?.authorization;

  if (fromAuth) {
    return fromAuth;
  }

  return fromHeader?.toLowerCase().startsWith('bearer ') ? fromHeader.slice(7).trim() : null;
}

async function attachAdapter(io) {
  try {
    const publisher = createRedisClient({ enableOfflineQueue: true });
    const subscriber = publisher.duplicate();

    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));

    logger.info('socket.io redis adapter attached');
  } catch (error) {
    logger.warn({ err: error }, 'socket.io running without redis adapter, single instance only');
  }
}

function registerHandlers(io) {
  io.on('connection', (socket) => {
    const { userId } = socket.data;

    socket.join(ROOM.user(userId));
    logger.debug({ userId, socket: socket.id }, 'socket connected');

    const guardWorkspace = async (workspaceId) => {
      const membership = await loadMembership(workspaceId, userId);

      if (!membership) {
        socket.emit(SOCKET_EVENT.ERROR, { event: SOCKET_EVENT.WORKSPACE_JOIN, message: 'Not a member' });
        return false;
      }

      return true;
    };

    socket.on(SOCKET_EVENT.WORKSPACE_JOIN, async (workspaceId) => {
      if (await guardWorkspace(workspaceId)) {
        socket.join(ROOM.workspace(workspaceId));
        io.to(ROOM.workspace(workspaceId)).emit(SOCKET_EVENT.PRESENCE_CHANGED, { userId, online: true });
      }
    });

    socket.on(SOCKET_EVENT.WORKSPACE_LEAVE, (workspaceId) => {
      socket.leave(ROOM.workspace(workspaceId));
      io.to(ROOM.workspace(workspaceId)).emit(SOCKET_EVENT.PRESENCE_CHANGED, { userId, online: false });
    });

    socket.on(SOCKET_EVENT.CHANNEL_JOIN, async ({ workspaceId, channelId }) => {
      try {
        await assertCanRead(workspaceId, channelId, userId);
        socket.join(ROOM.channel(channelId));
      } catch (error) {
        socket.emit(SOCKET_EVENT.ERROR, { event: SOCKET_EVENT.CHANNEL_JOIN, message: error.message });
      }
    });

    socket.on(SOCKET_EVENT.CHANNEL_LEAVE, (channelId) => socket.leave(ROOM.channel(channelId)));

    socket.on(SOCKET_EVENT.BOARD_JOIN, async ({ workspaceId, boardId }) => {
      if (!(await guardWorkspace(workspaceId))) {
        return;
      }

      const board = await Board.exists({ _id: boardId, workspace: workspaceId, archivedAt: null });

      if (board) {
        socket.join(ROOM.board(boardId));
      }
    });

    socket.on(SOCKET_EVENT.BOARD_LEAVE, (boardId) => socket.leave(ROOM.board(boardId)));

    socket.on(SOCKET_EVENT.TYPING_START, ({ channelId }) => {
      socket.to(ROOM.channel(channelId)).emit(SOCKET_EVENT.TYPING_START, { userId, channelId });
    });

    socket.on(SOCKET_EVENT.TYPING_STOP, ({ channelId }) => {
      socket.to(ROOM.channel(channelId)).emit(SOCKET_EVENT.TYPING_STOP, { userId, channelId });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, socket: socket.id, reason }, 'socket disconnected');
    });
  });
}

export async function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    path: '/realtime',
    pingInterval: PING_INTERVAL_MS,
    cors: { origin: corsOrigins, credentials: true }
  });

  io.use(async (socket, next) => {
    try {
      const user = await resolveAccessToken(handshakeToken(socket));

      socket.data.userId = String(user._id);
      socket.data.name = user.name;
      next();
    } catch (error) {
      next(new Error(error.message));
    }
  });

  await attachAdapter(io);
  registerHandlers(io);
  bindRealtime(io);

  return io;
}
