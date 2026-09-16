import type { Server } from 'socket.io';

import { ROOM } from '../constants/events.js';
import type { Id } from '../helpers/objectId.js';

let server: Server | null = null;

export function bindRealtime(instance: Server): void {
  server = instance;
}

function publish(room: string, event: string, payload: unknown): void {
  server?.to(room).emit(event, payload);
}

export function emitToUser(userId: Id, event: string, payload: unknown): void {
  publish(ROOM.user(String(userId)), event, payload);
}

export function emitToWorkspace(workspaceId: Id, event: string, payload: unknown): void {
  publish(ROOM.workspace(String(workspaceId)), event, payload);
}

export function emitToChannel(channelId: Id, event: string, payload: unknown): void {
  publish(ROOM.channel(String(channelId)), event, payload);
}

export function emitToBoard(boardId: Id, event: string, payload: unknown): void {
  publish(ROOM.board(String(boardId)), event, payload);
}
