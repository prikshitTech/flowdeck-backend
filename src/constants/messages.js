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
  PASSWORD_ROTATED: 'Password was changed, please sign in again',
  ROLE_NOT_ALLOWED: 'Your role does not allow this action'
};
