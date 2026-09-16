import asyncHandler from '../helpers/asyncHandler.js';
import * as auditService from '../services/audit.service.js';
import { COMMON_MESSAGES } from '../constants/messages.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListAuditQuery } from '../validators/audit.validator.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await auditService.listEntries(req.workspaceId, validQuery<ListAuditQuery>(req));

  res.list(items, pagination);
});

export const summary = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - validQuery<{ days: number }>(req).days * DAY_IN_MS);
  const result = await auditService.summarise(req.workspaceId, since);

  res.ok({ since, ...result }, COMMON_MESSAGES.FETCHED);
});
