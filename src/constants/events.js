export const SOCKET_EVENT = {
  WORKSPACE_JOIN: 'workspace:join',
  WORKSPACE_LEAVE: 'workspace:leave',
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  BOARD_JOIN: 'board:join',
  BOARD_LEAVE: 'board:leave',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  MESSAGE_CREATED: 'message:created',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  REACTION_UPDATED: 'reaction:updated',
  CARD_CREATED: 'card:created',
  CARD_UPDATED: 'card:updated',
  CARD_MOVED: 'card:moved',
  CARD_ARCHIVED: 'card:archived',
  PAGE_UPDATED: 'page:updated',
  NOTIFICATION_CREATED: 'notification:created',
  PRESENCE_CHANGED: 'presence:changed',
  ERROR: 'realtime:error'
};

export const ROOM = {
  user: (userId) => `user:${userId}`,
  workspace: (workspaceId) => `workspace:${workspaceId}`,
  channel: (channelId) => `channel:${channelId}`,
  board: (boardId) => `board:${boardId}`
};
