export const NOTIFICATION_TYPE = {
  MENTION: 'mention',
  CARD_ASSIGNED: 'card_assigned',
  CARD_UNASSIGNED: 'card_unassigned',
  CARD_MOVED: 'card_moved',
  CARD_COMPLETED: 'card_completed',
  CARD_REOPENED: 'card_reopened',
  CARD_UPDATED: 'card_updated',
  CARD_ARCHIVED: 'card_archived',
  CARD_DUE_SOON: 'card_due_soon',
  PAGE_EDITED: 'page_edited',
  PAGE_ARCHIVED: 'page_archived',
  MEMBER_ADDED: 'member_added',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_LEFT: 'member_left',
  OWNERSHIP_TRANSFERRED: 'ownership_transferred'
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const appLink = {
  workspace: (workspaceId: string) => `/w/${workspaceId}`,
  members: (workspaceId: string) => `/w/${workspaceId}/members`,
  board: (workspaceId: string, boardId: string) => `/w/${workspaceId}/boards/${boardId}`,
  page: (workspaceId: string, pageId: string) => `/w/${workspaceId}/pages/${pageId}`,
  channel: (workspaceId: string, channelId: string) => `/w/${workspaceId}/channels/${channelId}`,
  home: () => '/'
};
