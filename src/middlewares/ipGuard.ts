import asyncHandler from '../helpers/asyncHandler.js';
import { assertIpAllowed } from '../services/security.service.js';

const ipGuard = asyncHandler(async (req, _res, next) => {
  await assertIpAllowed(req.ip);
  next();
});

export default ipGuard;
