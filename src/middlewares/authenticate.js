import jwt from 'jsonwebtoken';

import ApiError from '../helpers/apiError.js';
import asyncHandler from '../helpers/asyncHandler.js';
import User from '../models/user.model.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { bearerToken } from '../helpers/requestContext.js';
import { verifyAccessToken } from '../helpers/token.js';

function readClaims(token) {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized(AUTH_MESSAGES.TOKEN_EXPIRED);
    }

    throw ApiError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
  }
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = bearerToken(req);

  if (!token) {
    throw ApiError.unauthorized(AUTH_MESSAGES.TOKEN_MISSING);
  }

  const claims = readClaims(token);
  const user = await User.findById(claims.sub);

  if (!user) {
    throw ApiError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
  }

  if (!user.isActive()) {
    throw ApiError.forbidden(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  if ((claims.ver ?? 0) !== user.tokenVersion) {
    throw ApiError.unauthorized(AUTH_MESSAGES.SESSION_REVOKED);
  }

  req.user = user;
  req.auth = { userId: String(user._id), role: user.role };

  return next();
});

export default authenticate;
