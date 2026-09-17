import asyncHandler from '../helpers/asyncHandler.js';
import * as adminService from '../services/admin.service.js';
import { ADMIN_MESSAGES, COMMON_MESSAGES } from '../constants/messages.js';
import { describeRequest } from '../helpers/requestContext.js';
import { login } from '../services/auth.service.js';

export const status = asyncHandler(async (req, res) => {
  const result = await adminService.setupStatus();

  res.ok(result, COMMON_MESSAGES.FETCHED);
});

export const createSuperAdmin = asyncHandler(async (req, res) => {
  const context = describeRequest(req);

  await adminService.createSuperAdmin(req.body, context);

  const { user, session } = await login({ email: req.body.email, password: req.body.password }, context);

  res.created({ user, ...session }, ADMIN_MESSAGES.CREATED);
});
