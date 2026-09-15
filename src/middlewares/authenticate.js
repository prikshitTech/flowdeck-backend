import asyncHandler from '../helpers/asyncHandler.js';
import { bearerToken } from '../helpers/requestContext.js';
import { resolveAccessToken } from '../services/identity.service.js';

const authenticate = asyncHandler(async (req, res, next) => {
  const user = await resolveAccessToken(bearerToken(req));

  req.user = user;
  req.auth = { userId: String(user._id), role: user.role };

  return next();
});

export default authenticate;
