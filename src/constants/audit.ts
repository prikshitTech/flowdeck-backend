export const AUDIT_ACTION = {
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_ARCHIVED: 'workspace.archived',
  MEMBER_ADDED: 'member.added',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',
  OWNERSHIP_TRANSFERRED: 'workspace.ownership_transferred',
  PAGE_CREATED: 'page.created',
  PAGE_UPDATED: 'page.updated',
  PAGE_MOVED: 'page.moved',
  PAGE_ARCHIVED: 'page.archived',
  PAGE_RESTORED: 'page.restored',
  BOARD_CREATED: 'board.created',
  BOARD_UPDATED: 'board.updated',
  BOARD_ARCHIVED: 'board.archived',
  CARD_CREATED: 'card.created',
  CARD_UPDATED: 'card.updated',
  CARD_MOVED: 'card.moved',
  CARD_ARCHIVED: 'card.archived',
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_ARCHIVED: 'channel.archived',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELETED: 'message.deleted',
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted'
} as const;

export const AUDIT_ENTITY = {
  WORKSPACE: 'workspace',
  MEMBER: 'member',
  PAGE: 'page',
  BOARD: 'board',
  LIST: 'list',
  CARD: 'card',
  CHANNEL: 'channel',
  MESSAGE: 'message',
  FILE: 'file'
} as const;

export const AUDIT_RETENTION_DAYS = 180;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];
