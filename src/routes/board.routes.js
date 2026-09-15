import { Router } from 'express';

import * as boardController from '../controllers/board.controller.js';
import auditTrail from '../middlewares/auditTrail.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../constants/audit.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { writeLimiter } from '../middlewares/rateLimiter.js';
import {
  boardParamsSchema,
  cardParamsSchema,
  createBoardSchema,
  createCardSchema,
  createListSchema,
  listBoardsSchema,
  listCardsSchema,
  listParamsSchema,
  moveCardSchema,
  updateBoardSchema,
  updateCardSchema,
  updateListSchema
} from '../validators/board.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);
const writer = requireWorkspaceRole(WORKSPACE_ROLE.MEMBER);
const manager = requireWorkspaceRole(WORKSPACE_ROLE.ADMIN);

router.use(authenticate);

router.post('/', writeLimiter, validate(createBoardSchema), writer, auditTrail(AUDIT_ACTION.BOARD_CREATED, AUDIT_ENTITY.BOARD), boardController.create);
router.get('/', validate(listBoardsSchema), reader, boardController.list);

router.get('/:boardId', validate(boardParamsSchema), reader, boardController.detail);
router.patch('/:boardId', writeLimiter, validate(updateBoardSchema), writer, auditTrail(AUDIT_ACTION.BOARD_UPDATED, AUDIT_ENTITY.BOARD), boardController.update);
router.delete('/:boardId', validate(boardParamsSchema), manager, auditTrail(AUDIT_ACTION.BOARD_ARCHIVED, AUDIT_ENTITY.BOARD), boardController.archive);

router.post('/:boardId/lists', writeLimiter, validate(createListSchema), writer, boardController.createList);
router.patch('/:boardId/lists/:listId', writeLimiter, validate(updateListSchema), writer, boardController.updateList);
router.delete('/:boardId/lists/:listId', validate(listParamsSchema), writer, boardController.archiveList);

router.get('/:boardId/cards', validate(listCardsSchema), reader, boardController.cards);
router.post('/:boardId/cards', writeLimiter, validate(createCardSchema), writer, auditTrail(AUDIT_ACTION.CARD_CREATED, AUDIT_ENTITY.CARD), boardController.createCard);
router.patch('/:boardId/cards/:cardId', writeLimiter, validate(updateCardSchema), writer, auditTrail(AUDIT_ACTION.CARD_UPDATED, AUDIT_ENTITY.CARD), boardController.updateCard);
router.post('/:boardId/cards/:cardId/move', writeLimiter, validate(moveCardSchema), writer, auditTrail(AUDIT_ACTION.CARD_MOVED, AUDIT_ENTITY.CARD), boardController.moveCard);
router.delete('/:boardId/cards/:cardId', validate(cardParamsSchema), writer, auditTrail(AUDIT_ACTION.CARD_ARCHIVED, AUDIT_ENTITY.CARD), boardController.archiveCard);

export default router;
