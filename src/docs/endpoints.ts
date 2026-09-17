import * as auth from '../validators/auth.validator.js';
import * as admin from '../validators/admin.validator.js';
import * as audit from '../validators/audit.validator.js';
import * as board from '../validators/board.validator.js';
import * as channel from '../validators/channel.validator.js';
import * as file from '../validators/file.validator.js';
import * as insight from '../validators/insight.validator.js';
import * as notification from '../validators/notification.validator.js';
import * as page from '../validators/page.validator.js';
import * as workspace from '../validators/workspace.validator.js';

import type { RequestSchemas } from '../middlewares/validate.js';

export interface Endpoint {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  tag: string;
  summary: string;
  auth?: false;
  role?: string;
  schema?: RequestSchemas;
  ok?: number;
  multipart?: boolean;
  binary?: boolean;
}

const WORKSPACE_BASE = '/workspaces/:workspaceId';

export const TAGS = [
  { name: 'Auth', description: 'Registration, sessions and token rotation' },
  { name: 'Workspaces', description: 'Tenants, members and roles' },
  { name: 'Pages', description: 'Nested documents with revision history' },
  { name: 'Boards', description: 'Boards, lists and cards' },
  { name: 'Channels', description: 'Channels, threads and reactions' },
  { name: 'Files', description: 'Streamed uploads and downloads' },
  { name: 'Search', description: 'Cross collection text search' },
  { name: 'Analytics', description: 'Workspace and board reporting' },
  { name: 'Audit', description: 'Immutable record of every mutation' },
  { name: 'Notifications', description: 'Mentions, assignments and reminders' },
  { name: 'System', description: 'Service health' },
  { name: 'Admin', description: 'One time super admin setup' }
];

export const ENDPOINTS: Endpoint[] = [
  { method: 'get', path: '/health', tag: 'System', summary: 'Service health probe', auth: false },

  { method: 'get', path: '/admin/setup', tag: 'Admin', summary: 'Whether the super admin seat is still open', auth: false },
  { method: 'post', path: '/admin/setup', tag: 'Admin', summary: 'Claim the single super admin account', auth: false, schema: admin.superAdminSchema, ok: 201 },

  { method: 'post', path: '/auth/register', tag: 'Auth', summary: 'Create an account', auth: false, schema: auth.registerSchema, ok: 201 },
  { method: 'post', path: '/auth/login', tag: 'Auth', summary: 'Sign in and receive a token pair', auth: false, schema: auth.loginSchema },
  { method: 'post', path: '/auth/refresh', tag: 'Auth', summary: 'Rotate a refresh token', auth: false, schema: auth.refreshSchema },
  { method: 'post', path: '/auth/logout', tag: 'Auth', summary: 'Revoke the current refresh token', auth: false, schema: auth.refreshSchema },
  { method: 'get', path: '/auth/me', tag: 'Auth', summary: 'Read the signed in account' },
  { method: 'patch', path: '/auth/me', tag: 'Auth', summary: 'Update profile details', schema: auth.updateProfileSchema },
  { method: 'post', path: '/auth/change-password', tag: 'Auth', summary: 'Change password and revoke sessions', schema: auth.changePasswordSchema },
  { method: 'post', path: '/auth/logout-all', tag: 'Auth', summary: 'Revoke every active session' },
  { method: 'get', path: '/auth/sessions', tag: 'Auth', summary: 'List active sessions' },
  { method: 'delete', path: '/auth/sessions/:sessionId', tag: 'Auth', summary: 'Revoke one session', schema: auth.sessionParamsSchema },

  { method: 'post', path: '/workspaces', tag: 'Workspaces', summary: 'Create a workspace', schema: workspace.createWorkspaceSchema, ok: 201 },
  { method: 'get', path: '/workspaces', tag: 'Workspaces', summary: 'List workspaces you belong to', schema: workspace.listWorkspacesSchema },
  { method: 'get', path: WORKSPACE_BASE, tag: 'Workspaces', summary: 'Read one workspace', schema: workspace.workspaceParamsSchema },
  { method: 'patch', path: WORKSPACE_BASE, tag: 'Workspaces', summary: 'Update a workspace', role: 'admin', schema: workspace.updateWorkspaceSchema },
  { method: 'delete', path: WORKSPACE_BASE, tag: 'Workspaces', summary: 'Archive a workspace', role: 'owner', schema: workspace.workspaceParamsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/members`, tag: 'Workspaces', summary: 'List members', schema: workspace.listMembersSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/members`, tag: 'Workspaces', summary: 'Add a member', role: 'admin', schema: workspace.addMemberSchema, ok: 201 },
  { method: 'patch', path: `${WORKSPACE_BASE}/members/:memberId`, tag: 'Workspaces', summary: 'Change a member role', role: 'admin', schema: workspace.updateMemberSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/members/:memberId`, tag: 'Workspaces', summary: 'Remove a member', role: 'admin', schema: workspace.memberParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/transfer-ownership`, tag: 'Workspaces', summary: 'Transfer ownership', role: 'owner', schema: workspace.transferOwnershipSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/leave`, tag: 'Workspaces', summary: 'Leave a workspace', schema: workspace.workspaceParamsSchema },

  { method: 'post', path: `${WORKSPACE_BASE}/pages`, tag: 'Pages', summary: 'Create a page', role: 'member', schema: page.createPageSchema, ok: 201 },
  { method: 'get', path: `${WORKSPACE_BASE}/pages`, tag: 'Pages', summary: 'List pages', schema: page.listPagesSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/pages/tree`, tag: 'Pages', summary: 'Read the page tree', schema: page.treeSchema },
  { method: 'patch', path: `${WORKSPACE_BASE}/pages/reorder`, tag: 'Pages', summary: 'Reorder sibling pages', role: 'member', schema: page.reorderPagesSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/pages/:pageId`, tag: 'Pages', summary: 'Read a page with breadcrumb', schema: page.pageParamsSchema },
  { method: 'patch', path: `${WORKSPACE_BASE}/pages/:pageId`, tag: 'Pages', summary: 'Update a page and snapshot a revision', role: 'member', schema: page.updatePageSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/pages/:pageId`, tag: 'Pages', summary: 'Archive a page and its children', role: 'member', schema: page.pageParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/pages/:pageId/move`, tag: 'Pages', summary: 'Move a page in the tree', role: 'member', schema: page.movePageSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/pages/:pageId/revisions`, tag: 'Pages', summary: 'List revisions', schema: page.listRevisionsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/pages/:pageId/revisions/:version/restore`, tag: 'Pages', summary: 'Restore a revision', role: 'member', schema: page.restoreRevisionSchema },

  { method: 'post', path: `${WORKSPACE_BASE}/boards`, tag: 'Boards', summary: 'Create a board with default lists', role: 'member', schema: board.createBoardSchema, ok: 201 },
  { method: 'get', path: `${WORKSPACE_BASE}/boards`, tag: 'Boards', summary: 'List boards with card counts', schema: board.listBoardsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/boards/:boardId`, tag: 'Boards', summary: 'Read a full board snapshot', schema: board.boardParamsSchema },
  { method: 'patch', path: `${WORKSPACE_BASE}/boards/:boardId`, tag: 'Boards', summary: 'Update a board', role: 'member', schema: board.updateBoardSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/boards/:boardId`, tag: 'Boards', summary: 'Archive a board and its contents', role: 'admin', schema: board.boardParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/boards/:boardId/lists`, tag: 'Boards', summary: 'Add a list', role: 'member', schema: board.createListSchema, ok: 201 },
  { method: 'patch', path: `${WORKSPACE_BASE}/boards/:boardId/lists/:listId`, tag: 'Boards', summary: 'Update a list or its wip limit', role: 'member', schema: board.updateListSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/boards/:boardId/lists/:listId`, tag: 'Boards', summary: 'Archive a list', role: 'member', schema: board.listParamsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/boards/:boardId/cards`, tag: 'Boards', summary: 'Filter cards', schema: board.listCardsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/boards/:boardId/cards`, tag: 'Boards', summary: 'Create a card', role: 'member', schema: board.createCardSchema, ok: 201 },
  { method: 'patch', path: `${WORKSPACE_BASE}/boards/:boardId/cards/:cardId`, tag: 'Boards', summary: 'Update a card', role: 'member', schema: board.updateCardSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/boards/:boardId/cards/:cardId/move`, tag: 'Boards', summary: 'Move a card between lists', role: 'member', schema: board.moveCardSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/boards/:boardId/cards/:cardId`, tag: 'Boards', summary: 'Archive a card', role: 'member', schema: board.cardParamsSchema },

  { method: 'post', path: `${WORKSPACE_BASE}/channels`, tag: 'Channels', summary: 'Create a channel', role: 'member', schema: channel.createChannelSchema, ok: 201 },
  { method: 'get', path: `${WORKSPACE_BASE}/channels`, tag: 'Channels', summary: 'List visible channels', schema: channel.listChannelsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/channels/:channelId`, tag: 'Channels', summary: 'Read a channel with unread count', schema: channel.channelParamsSchema },
  { method: 'patch', path: `${WORKSPACE_BASE}/channels/:channelId`, tag: 'Channels', summary: 'Update a channel', role: 'member', schema: channel.updateChannelSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/channels/:channelId`, tag: 'Channels', summary: 'Archive a channel', role: 'admin', schema: channel.channelParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/channels/:channelId/join`, tag: 'Channels', summary: 'Join a public channel', role: 'member', schema: channel.channelParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/channels/:channelId/leave`, tag: 'Channels', summary: 'Leave a channel', schema: channel.channelParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/channels/:channelId/read`, tag: 'Channels', summary: 'Mark a channel read', schema: channel.channelParamsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/channels/:channelId/messages`, tag: 'Channels', summary: 'Read messages with a cursor', schema: channel.listMessagesSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/channels/:channelId/messages`, tag: 'Channels', summary: 'Post a message or thread reply', role: 'member', schema: channel.sendMessageSchema, ok: 201 },
  { method: 'patch', path: `${WORKSPACE_BASE}/channels/:channelId/messages/:messageId`, tag: 'Channels', summary: 'Edit your own message', role: 'member', schema: channel.editMessageSchema },
  { method: 'delete', path: `${WORKSPACE_BASE}/channels/:channelId/messages/:messageId`, tag: 'Channels', summary: 'Delete your own message', role: 'member', schema: channel.messageParamsSchema },
  { method: 'post', path: `${WORKSPACE_BASE}/channels/:channelId/messages/:messageId/reactions`, tag: 'Channels', summary: 'Toggle a reaction', role: 'member', schema: channel.reactionSchema },

  { method: 'post', path: `${WORKSPACE_BASE}/files`, tag: 'Files', summary: 'Upload a file as multipart/form-data', role: 'member', schema: file.uploadSchema, ok: 201, multipart: true },
  { method: 'get', path: `${WORKSPACE_BASE}/files`, tag: 'Files', summary: 'List files', schema: file.listFilesSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/files/usage`, tag: 'Files', summary: 'Storage usage by type', schema: file.usageSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/files/:fileId`, tag: 'Files', summary: 'Read file metadata', schema: file.fileParamsSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/files/:fileId/download`, tag: 'Files', summary: 'Download a file, range requests supported', schema: file.fileParamsSchema, binary: true },
  { method: 'delete', path: `${WORKSPACE_BASE}/files/:fileId`, tag: 'Files', summary: 'Delete a file', role: 'member', schema: file.fileParamsSchema },

  { method: 'get', path: `${WORKSPACE_BASE}/search`, tag: 'Search', summary: 'Search pages, cards and messages', schema: insight.searchSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/search/suggestions`, tag: 'Search', summary: 'Type ahead suggestions', schema: insight.suggestSchema },

  { method: 'get', path: `${WORKSPACE_BASE}/analytics/overview`, tag: 'Analytics', summary: 'Workspace activity overview', schema: insight.overviewSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/analytics/members`, tag: 'Analytics', summary: 'Member activity leaderboard', schema: insight.overviewSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/analytics/boards/:boardId`, tag: 'Analytics', summary: 'Board throughput and completion rate', schema: insight.boardAnalyticsSchema },

  { method: 'get', path: `${WORKSPACE_BASE}/audit-logs`, tag: 'Audit', summary: 'Filter the audit trail', role: 'admin', schema: audit.listAuditSchema },
  { method: 'get', path: `${WORKSPACE_BASE}/audit-logs/summary`, tag: 'Audit', summary: 'Audit activity summary', role: 'admin', schema: audit.auditSummarySchema },

  { method: 'get', path: '/notifications', tag: 'Notifications', summary: 'List your notifications', schema: notification.listNotificationsSchema },
  { method: 'get', path: '/notifications/unread-count', tag: 'Notifications', summary: 'Unread totals by workspace' },
  { method: 'patch', path: '/notifications/:notificationId/read', tag: 'Notifications', summary: 'Mark one notification read', schema: notification.notificationParamsSchema },
  { method: 'post', path: '/notifications/read-all', tag: 'Notifications', summary: 'Mark every notification read', schema: notification.markAllReadSchema }
];
