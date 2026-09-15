export const COMMON_MESSAGES = {
  ROUTE_NOT_FOUND: 'The requested route does not exist',
  INTERNAL_ERROR: 'Something went wrong, please try again',
  VALIDATION_FAILED: 'Request payload failed validation',
  DUPLICATE_RESOURCE: 'A record with these details already exists',
  INVALID_IDENTIFIER: 'The provided identifier is not valid',
  NOT_FOUND: 'Resource not found',
  FETCHED: 'Fetched successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully'
};

export const AUTH_MESSAGES = {
  REGISTERED: 'Account created successfully',
  LOGGED_IN: 'Logged in successfully',
  LOGGED_OUT: 'Logged out successfully',
  TOKEN_REFRESHED: 'Session refreshed successfully',
  PASSWORD_CHANGED: 'Password updated successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  EMAIL_TAKEN: 'An account with this email already exists',
  INVALID_CREDENTIALS: 'Email or password is incorrect',
  ACCOUNT_NOT_ACTIVE: 'This account is not active, please contact support',
  REFRESH_TOKEN_REQUIRED: 'A refresh token is required',
  REFRESH_TOKEN_INVALID: 'Refresh token is invalid or has already been used',
  CURRENT_PASSWORD_WRONG: 'Current password is incorrect',
  SESSION_NOT_FOUND: 'Session not found',
  SESSIONS_REVOKED: 'All other sessions were revoked',
  TOKEN_MISSING: 'Authorization header with a bearer token is required',
  TOKEN_INVALID: 'Access token is invalid',
  TOKEN_EXPIRED: 'Access token has expired',
  SESSION_REVOKED: 'This session is no longer valid, please sign in again',
  ROLE_NOT_ALLOWED: 'Your role does not allow this action'
};

export const WORKSPACE_MESSAGES = {
  CREATED: 'Workspace created successfully',
  UPDATED: 'Workspace updated successfully',
  ARCHIVED: 'Workspace archived successfully',
  DELETED: 'Workspace deleted successfully',
  NOT_FOUND: 'Workspace not found',
  NOT_A_MEMBER: 'You are not a member of this workspace',
  ROLE_TOO_LOW: 'Your workspace role does not allow this action',
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_UPDATED: 'Member role updated successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  MEMBER_EXISTS: 'This user is already a member of the workspace',
  MEMBER_NOT_FOUND: 'Member not found in this workspace',
  OWNER_ROLE_LOCKED: 'The workspace owner role can only change through a transfer',
  OWNER_CANNOT_LEAVE: 'Transfer ownership before leaving the workspace',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred successfully',
  USER_NOT_FOUND: 'No account exists with that email'
};

export const PAGE_MESSAGES = {
  CREATED: 'Page created successfully',
  UPDATED: 'Page updated successfully',
  MOVED: 'Page moved successfully',
  REORDERED: 'Pages reordered successfully',
  ARCHIVED: 'Page archived successfully',
  RESTORED: 'Page restored to the selected revision',
  NOT_FOUND: 'Page not found',
  REVISION_NOT_FOUND: 'That revision does not exist for this page',
  TOO_DEEP: 'Pages cannot be nested any deeper',
  CANNOT_NEST_IN_SELF: 'A page cannot be nested inside itself',
  CANNOT_NEST_IN_DESCENDANT: 'A page cannot be nested inside one of its own children'
};

export const BOARD_MESSAGES = {
  CREATED: 'Board created successfully',
  UPDATED: 'Board updated successfully',
  ARCHIVED: 'Board archived successfully',
  NOT_FOUND: 'Board not found',
  LIST_CREATED: 'List created successfully',
  LIST_UPDATED: 'List updated successfully',
  LIST_ARCHIVED: 'List archived successfully',
  LIST_NOT_FOUND: 'List not found on this board',
  LIST_FULL: 'This list has reached its card limit',
  CARD_CREATED: 'Card created successfully',
  CARD_UPDATED: 'Card updated successfully',
  CARD_MOVED: 'Card moved successfully',
  CARD_ARCHIVED: 'Card archived successfully',
  CARD_NOT_FOUND: 'Card not found on this board',
  ASSIGNEE_NOT_MEMBER: 'Cards can only be assigned to workspace members'
};

export const CHANNEL_MESSAGES = {
  CREATED: 'Channel created successfully',
  UPDATED: 'Channel updated successfully',
  ARCHIVED: 'Channel archived successfully',
  JOINED: 'Joined the channel',
  LEFT: 'Left the channel',
  READ: 'Channel marked as read',
  NOT_FOUND: 'Channel not found',
  NAME_TAKEN: 'A channel with this name already exists in the workspace',
  PRIVATE_ACCESS: 'This channel is private, ask a member to invite you',
  ALREADY_JOINED: 'You are already in this channel',
  NOT_JOINED: 'Join the channel before posting',
  MESSAGE_SENT: 'Message sent',
  MESSAGE_UPDATED: 'Message updated',
  MESSAGE_DELETED: 'Message deleted',
  MESSAGE_NOT_FOUND: 'Message not found',
  NOT_MESSAGE_AUTHOR: 'You can only change your own messages',
  REACTION_UPDATED: 'Reaction updated'
};

export const NOTIFICATION_MESSAGES = {
  NOT_FOUND: 'Notification not found',
  MARKED_READ: 'Notification marked as read',
  ALL_MARKED_READ: 'Notifications marked as read'
};

export const SEARCH_MESSAGES = {
  RESULTS: 'Search completed',
  SUGGESTIONS: 'Suggestions ready',
  QUERY_TOO_SHORT: 'Search needs at least two characters'
};
