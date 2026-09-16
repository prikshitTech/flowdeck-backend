import asyncHandler from '../helpers/asyncHandler.js';
import { bearerToken } from '../helpers/requestContext.js';
import { resolveAccessToken } from '../services/identity.service.js';

const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await resolveAccessToken(bearerToken(req));

  req.user = user;
  req.auth = { userId: String(user._id), role: user.role };

  next();
});

export default authenticate;
