import ApiError from '../helpers/apiError.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { SYSTEM_ROLE } from '../constants/roles.js';

export function requireRole(...roles) {
  const allowed = new Set(roles);

  return (req, res, next) => {
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
