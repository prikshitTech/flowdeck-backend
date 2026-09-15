import { ROOM } from '../constants/events.js';

let server = null;

export function bindRealtime(instance) {
  server = instance;
}

function publish(room, event, payload) {
  server?.to(room).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  publish(ROOM.user(userId), event, payload);
}

export function emitToWorkspace(workspaceId, event, payload) {
  publish(ROOM.workspace(workspaceId), event, payload);
}

export function emitToChannel(channelId, event, payload) {
  publish(ROOM.channel(channelId), event, payload);
}

export function emitToBoard(boardId, event, payload) {
  publish(ROOM.board(boardId), event, payload);
}
