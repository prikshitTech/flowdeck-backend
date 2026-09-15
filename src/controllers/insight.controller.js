import ApiError from '../helpers/apiError.js';
import asyncHandler from '../helpers/asyncHandler.js';
import * as analyticsService from '../services/analytics.service.js';
import * as searchService from '../services/search.service.js';
import { BOARD_MESSAGES, COMMON_MESSAGES, SEARCH_MESSAGES } from '../constants/messages.js';

export const search = asyncHandler(async (req, res) => {
  const { items, pagination, byKind } = await searchService.searchWorkspace(
    req.workspaceId,
    req.auth.userId,
    req.query
  );

  res.list(items, { ...pagination, byKind }, SEARCH_MESSAGES.RESULTS);
});

export const suggest = asyncHandler(async (req, res) => {
  const suggestions = await searchService.suggest(req.workspaceId, req.auth.userId, req.query.q);

  res.ok(suggestions, SEARCH_MESSAGES.SUGGESTIONS);
});

export const overview = asyncHandler(async (req, res) => {
  const result = await analyticsService.workspaceOverview(req.workspaceId, req.query.days);

  res.ok(result, COMMON_MESSAGES.FETCHED);
});

export const board = asyncHandler(async (req, res) => {
  const result = await analyticsService.boardThroughput(req.workspaceId, req.params.boardId);

  if (!result) {
    throw ApiError.notFound(BOARD_MESSAGES.NOT_FOUND);
  }

  res.ok(result, COMMON_MESSAGES.FETCHED);
});

export const members = asyncHandler(async (req, res) => {
  const result = await analyticsService.memberActivity(req.workspaceId, req.query.days);

  res.ok(result, COMMON_MESSAGES.FETCHED);
});
