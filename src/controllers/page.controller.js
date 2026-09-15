import asyncHandler from '../helpers/asyncHandler.js';
import * as pageService from '../services/page.service.js';
import { COMMON_MESSAGES, PAGE_MESSAGES } from '../constants/messages.js';

export const create = asyncHandler(async (req, res) => {
  const page = await pageService.createPage(req.workspaceId, req.auth.userId, req.body);

  res.created(page, PAGE_MESSAGES.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await pageService.listPages(req.workspaceId, req.query);

  res.list(items, pagination);
});

export const tree = asyncHandler(async (req, res) => {
  const nodes = await pageService.pageTree(req.workspaceId);

  res.ok(nodes, COMMON_MESSAGES.FETCHED);
});

export const detail = asyncHandler(async (req, res) => {
  const page = await pageService.getPage(req.workspaceId, req.params.pageId);

  res.ok(page, COMMON_MESSAGES.FETCHED);
});

export const update = asyncHandler(async (req, res) => {
  const page = await pageService.updatePage(req.workspaceId, req.params.pageId, req.auth.userId, req.body);

  res.ok(page, PAGE_MESSAGES.UPDATED);
});

export const move = asyncHandler(async (req, res) => {
  const page = await pageService.movePage(req.workspaceId, req.params.pageId, req.body);

  res.ok(page, PAGE_MESSAGES.MOVED);
});

export const reorder = asyncHandler(async (req, res) => {
  const result = await pageService.reorderPages(req.workspaceId, req.body.entries);

  res.ok(result, PAGE_MESSAGES.REORDERED);
});

export const archive = asyncHandler(async (req, res) => {
  const result = await pageService.archivePage(req.workspaceId, req.params.pageId);

  res.ok(result, PAGE_MESSAGES.ARCHIVED);
});

export const revisions = asyncHandler(async (req, res) => {
  const { items, pagination } = await pageService.listRevisions(req.workspaceId, req.params.pageId, req.query);

  res.list(items, pagination);
});

export const restore = asyncHandler(async (req, res) => {
  const page = await pageService.restoreRevision(
    req.workspaceId,
    req.params.pageId,
    req.params.version,
    req.auth.userId
  );

  res.ok(page, PAGE_MESSAGES.RESTORED);
});
