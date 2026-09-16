import type { RequestHandler } from 'express';

import ApiError from '../helpers/apiError.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { SYSTEM_ROLE, type SystemRole } from '../constants/roles.js';

export function requireRole(...roles: SystemRole[]): RequestHandler {
  const allowed = new Set<string>(roles);

  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized(AUTH_MESSAGES.TOKEN_MISSING));
    }

    if (!allowed.has(req.user.role)) {
      return next(ApiError.forbidden(AUTH_MESSAGES.ROLE_NOT_ALLOWED));
    }

    return next();
  };
}

export const requirePlatformAdmin = requireRole(SYSTEM_ROLE.SUPER_ADMIN);
export const requireSupportStaff = requireRole(SYSTEM_ROLE.SUPER_ADMIN, SYSTEM_ROLE.SUPPORT);
