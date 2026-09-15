import asyncHandler from '../helpers/asyncHandler.js';
import * as auditService from '../services/audit.service.js';
import { COMMON_MESSAGES } from '../constants/messages.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await auditService.listEntries(req.workspaceId, req.query);

  res.list(items, pagination);
});

export const summary = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - req.query.days * DAY_IN_MS);
  const result = await auditService.summarise(req.workspaceId, since);

  res.ok({ since, ...result }, COMMON_MESSAGES.FETCHED);
});
