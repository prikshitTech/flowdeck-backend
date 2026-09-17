import asyncHandler from '../helpers/asyncHandler.js';
import * as boardService from '../services/board.service.js';
import { BOARD_MESSAGES, COMMON_MESSAGES } from '../constants/messages.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListBoardsQuery, ListCardsQuery } from '../validators/board.validator.js';

export const create = asyncHandler(async (req, res) => {
  const board = await boardService.createBoard(req.workspaceId, req.auth.userId, req.body);

  res.created(board, BOARD_MESSAGES.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await boardService.listBoards(req.workspaceId, validQuery<ListBoardsQuery>(req));

  res.list(items, pagination);
});

export const detail = asyncHandler(async (req, res) => {
  const board = await boardService.boardSnapshot(req.workspaceId, req.params.boardId);

  res.ok(board, COMMON_MESSAGES.FETCHED);
});

export const update = asyncHandler(async (req, res) => {
  const board = await boardService.updateBoard(req.workspaceId, req.params.boardId, req.body);

  res.ok(board, BOARD_MESSAGES.UPDATED);
});

export const archive = asyncHandler(async (req, res) => {
  const result = await boardService.archiveBoard(req.workspaceId, req.params.boardId);

  res.ok(result, BOARD_MESSAGES.ARCHIVED);
});

export const createList = asyncHandler(async (req, res) => {
  const created = await boardService.createList(req.workspaceId, req.params.boardId, req.body);

  res.created(created, BOARD_MESSAGES.LIST_CREATED);
});

export const updateList = asyncHandler(async (req, res) => {
  const updated = await boardService.updateList(
    req.workspaceId,
    req.params.boardId,
    req.params.listId,
    req.body
  );

  res.ok(updated, BOARD_MESSAGES.LIST_UPDATED);
});

export const archiveList = asyncHandler(async (req, res) => {
  const result = await boardService.archiveList(req.workspaceId, req.params.boardId, req.params.listId);

  res.ok(result, BOARD_MESSAGES.LIST_ARCHIVED);
});

export const createCard = asyncHandler(async (req, res) => {
  const card = await boardService.createCard(
    req.workspaceId,
    req.params.boardId,
    req.auth.userId,
    req.body
  );

  res.created(card, BOARD_MESSAGES.CARD_CREATED);
});

export const cards = asyncHandler(async (req, res) => {
  const { items, pagination } = await boardService.listCards(req.workspaceId, req.params.boardId, validQuery<ListCardsQuery>(req));

  res.list(items, pagination);
});

export const updateCard = asyncHandler(async (req, res) => {
  const card = await boardService.updateCard(
    req.workspaceId,
    req.params.boardId,
    req.params.cardId,
    req.auth.userId,
    req.body
  );

  res.ok(card, BOARD_MESSAGES.CARD_UPDATED);
});

export const moveCard = asyncHandler(async (req, res) => {
  const card = await boardService.moveCard(
    req.workspaceId,
    req.params.boardId,
    req.params.cardId,
    req.auth.userId,
    req.body
  );

  res.ok(card, BOARD_MESSAGES.CARD_MOVED);
});

export const archiveCard = asyncHandler(async (req, res) => {
  const result = await boardService.archiveCard(req.workspaceId, req.params.boardId, req.params.cardId, req.auth.userId);

  res.ok(result, BOARD_MESSAGES.CARD_ARCHIVED);
});
