
import ApiError from '../helpers/apiError.js';
import Board from '../models/board.model.js';
import BoardList from '../models/boardList.model.js';
import Card from '../models/card.model.js';
import Membership from '../models/membership.model.js';
import { BOARD_MESSAGES } from '../constants/messages.js';
import { CACHE_TTL, cacheKey } from '../constants/cacheKeys.js';
import { DEFAULT_LISTS } from '../constants/board.js';
import { JOB, QUEUE } from '../constants/queues.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { emitToBoard } from '../sockets/emitter.js';
import { enqueue } from '../queues/index.js';
import { fanOutAssignment } from './notification.service.js';
import { dropByPrefix, remember } from './cache.service.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import { withTransaction } from '../helpers/transaction.js';
import type { Id } from '../helpers/objectId.js';
import type {
  CreateBoardInput,
  CreateCardInput,
  CreateListInput,
  ListBoardsQuery,
  ListCardsQuery,
  MoveCardInput,
  UpdateBoardInput,
  UpdateCardInput,
  UpdateListInput
} from '../validators/board.validator.js';
import { toObjectId } from '../helpers/objectId.js';

type Match = Record<string, unknown>;

function invalidate(workspaceId: string) {
  return dropByPrefix(cacheKey.workspaceTag(workspaceId));
}

async function loadBoard(workspaceId: string, boardId: string) {
  const board = await Board.findOne({ _id: boardId, workspace: workspaceId, archivedAt: null });

  if (!board) {
    throw ApiError.notFound(BOARD_MESSAGES.NOT_FOUND);
  }

  return board;
}

async function loadList(boardId: string, listId: Id) {
  const list = await BoardList.findOne({ _id: listId, board: boardId, archivedAt: null });

  if (!list) {
    throw ApiError.notFound(BOARD_MESSAGES.LIST_NOT_FOUND);
  }

  return list;
}

async function loadCard(boardId: string, cardId: string) {
  const card = await Card.findOne({ _id: cardId, board: boardId, archivedAt: null });

  if (!card) {
    throw ApiError.notFound(BOARD_MESSAGES.CARD_NOT_FOUND);
  }

  return card;
}

async function assertMembers(workspaceId: string, userIds: string[] | undefined) {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const found = await Membership.countDocuments({ workspace: workspaceId, user: { $in: userIds } });

  if (found !== new Set(userIds.map(String)).size) {
    throw ApiError.badRequest(BOARD_MESSAGES.ASSIGNEE_NOT_MEMBER);
  }
}

export async function createBoard(workspaceId: string, authorId: string, payload: CreateBoardInput) {
  const board = await withTransaction(async (session) => {
    const [created] = await Board.create(
      [{ ...payload, workspace: workspaceId, createdBy: authorId }],
      { session }
    );

    await BoardList.create(
      DEFAULT_LISTS.map((name, index) => ({
        board: created._id,
        workspace: workspaceId,
        name,
        position: index
      })),
      { session, ordered: true }
    );

    return created;
  });

  await invalidate(workspaceId);
  return board;
}

export async function listBoards(workspaceId: string, query: ListBoardsQuery) {
  const result = await Board.aggregate([
    { $match: { workspace: toObjectId(workspaceId), archivedAt: null } },
    {
      $lookup: {
        from: 'cards',
        let: { boardId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$board', '$$boardId'] }, archivedAt: null } },
          { $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: ['$completedAt', 1, 0] } } } }
        ],
        as: 'cardStats'
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        description: 1,
        colour: 1,
        updatedAt: 1,
        cardCount: { $ifNull: [{ $first: '$cardStats.total' }, 0] },
        completedCount: { $ifNull: [{ $first: '$cardStats.done' }, 0] }
      }
    },
    { $sort: { updatedAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function boardSnapshot(workspaceId: string, boardId: string) {
  await loadBoard(workspaceId, boardId);

  return remember(cacheKey.boardSnapshot(boardId), CACHE_TTL.SHORT, async () => {
    const [board] = await Board.aggregate([
      { $match: { _id: toObjectId(boardId) } },
      {
        $lookup: {
          from: 'boardlists',
          let: { boardId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$board', '$$boardId'] }, archivedAt: null } },
            { $sort: { position: 1 } },
            {
              $lookup: {
                from: 'cards',
                let: { listId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$list', '$$listId'] }, archivedAt: null } },
                  { $sort: { position: 1 } },
                  {
                    $project: {
                      _id: 0,
                      id: '$_id',
                      title: 1,
                      position: 1,
                      priority: 1,
                      labels: 1,
                      assignees: 1,
                      dueAt: 1,
                      completedAt: 1
                    }
                  }
                ],
                as: 'cards'
              }
            },
            { $project: { _id: 0, id: '$_id', name: 1, position: 1, cardLimit: 1, cards: 1 } }
          ],
          as: 'lists'
        }
      },
      { $project: { _id: 0, id: '$_id', name: 1, description: 1, colour: 1, lists: 1, updatedAt: 1 } }
    ]);

    return board;
  });
}

export async function updateBoard(workspaceId: string, boardId: string, payload: UpdateBoardInput) {
  const board = await loadBoard(workspaceId, boardId);

  board.set(payload);
  await board.save();

  await invalidate(workspaceId);
  return board;
}

export async function archiveBoard(workspaceId: string, boardId: string) {
  const board = await loadBoard(workspaceId, boardId);
  const archivedAt = new Date();

  await withTransaction(async (session) => {
    await Board.updateOne({ _id: board._id }, { $set: { archivedAt } }, { session });
    await BoardList.updateMany({ board: board._id }, { $set: { archivedAt } }, { session });
    await Card.updateMany({ board: board._id }, { $set: { archivedAt } }, { session });
  });

  await invalidate(workspaceId);
  return { archived: String(board._id) };
}

export async function createList(workspaceId: string, boardId: string, payload: CreateListInput) {
  const board = await loadBoard(workspaceId, boardId);
  const position = await BoardList.countDocuments({ board: board._id, archivedAt: null });

  const list = await BoardList.create({ ...payload, board: board._id, workspace: workspaceId, position });

  await invalidate(workspaceId);
  return list;
}

export async function updateList(workspaceId: string, boardId: string, listId: string, payload: UpdateListInput) {
  await loadBoard(workspaceId, boardId);
  const list = await loadList(boardId, listId);

  list.set(payload);
  await list.save();

  await invalidate(workspaceId);
  return list;
}

export async function archiveList(workspaceId: string, boardId: string, listId: string) {
  await loadBoard(workspaceId, boardId);
  const list = await loadList(boardId, listId);
  const archivedAt = new Date();

  await withTransaction(async (session) => {
    await BoardList.updateOne({ _id: list._id }, { $set: { archivedAt } }, { session });
    await Card.updateMany({ list: list._id, archivedAt: null }, { $set: { archivedAt } }, { session });
    await BoardList.updateMany(
      { board: boardId, position: { $gt: list.position }, archivedAt: null },
      { $inc: { position: -1 } },
      { session }
    );
  });

  await invalidate(workspaceId);
  return { archived: String(list._id) };
}

export async function createCard(workspaceId: string, boardId: string, authorId: string, payload: CreateCardInput) {
  await loadBoard(workspaceId, boardId);
  const list = await loadList(boardId, payload.list);
  await assertMembers(workspaceId, payload.assignees);

  const position = await Card.countDocuments({ list: list._id, archivedAt: null });

  if (list.cardLimit && position >= list.cardLimit) {
    throw ApiError.badRequest(BOARD_MESSAGES.LIST_FULL);
  }

  const card = await Card.create({
    ...payload,
    board: boardId,
    list: list._id,
    workspace: workspaceId,
    position,
    createdBy: authorId
  });

  await invalidate(workspaceId);
  await announceAssignment(card, authorId, payload.assignees);

  emitToBoard(boardId, SOCKET_EVENT.CARD_CREATED, card.toJSON());

  return card;
}

async function announceAssignment(card: { _id: unknown }, actorId: string, assignees: string[] | undefined) {
  if (!assignees?.length) {
    return;
  }

  await enqueue(
    QUEUE.NOTIFICATION,
    JOB.CARD_ASSIGNED,
    { cardId: String(card._id), actorId: String(actorId), assignees: assignees.map(String) },
    { runInline: fanOutAssignment }
  );
}

export async function updateCard(workspaceId: string, boardId: string, cardId: string, payload: UpdateCardInput) {
  await loadBoard(workspaceId, boardId);
  const card = await loadCard(boardId, cardId);
  await assertMembers(workspaceId, payload.assignees);

  if (payload.completed !== undefined) {
    card.completedAt = payload.completed ? new Date() : null;
    delete payload.completed;
  }

  card.set(payload);
  await card.save();

  await invalidate(workspaceId);
  emitToBoard(boardId, SOCKET_EVENT.CARD_UPDATED, card.toJSON());

  return card;
}

export async function moveCard(workspaceId: string, boardId: string, cardId: string, { list: targetListId, position }: MoveCardInput) {
  await loadBoard(workspaceId, boardId);
  const card = await loadCard(boardId, cardId);
  const target = await loadList(boardId, targetListId ?? card.list);

  const sameList = String(target._id) === String(card.list);
  const occupied = await Card.countDocuments({ list: target._id, archivedAt: null, _id: { $ne: card._id } });

  if (!sameList && target.cardLimit && occupied >= target.cardLimit) {
    throw ApiError.badRequest(BOARD_MESSAGES.LIST_FULL);
  }

  const nextPosition = Math.min(position ?? occupied, occupied);
  const sourceListId = card.list;

  await withTransaction(async (session) => {
    await Card.updateMany(
      { list: sourceListId, position: { $gt: card.position }, archivedAt: null, _id: { $ne: card._id } },
      { $inc: { position: -1 } },
      { session }
    );

    await Card.updateMany(
      { list: target._id, position: { $gte: nextPosition }, archivedAt: null, _id: { $ne: card._id } },
      { $inc: { position: 1 } },
      { session }
    );

    card.set({ list: target._id, position: nextPosition });
    await card.save({ session });
  });

  await invalidate(workspaceId);
  emitToBoard(boardId, SOCKET_EVENT.CARD_MOVED, {
    id: String(card._id),
    list: String(card.list),
    position: card.position,
    from: String(sourceListId)
  });

  return card;
}

export async function archiveCard(workspaceId: string, boardId: string, cardId: string) {
  await loadBoard(workspaceId, boardId);
  const card = await loadCard(boardId, cardId);

  await withTransaction(async (session) => {
    await Card.updateOne({ _id: card._id }, { $set: { archivedAt: new Date() } }, { session });
    await Card.updateMany(
      { list: card.list, position: { $gt: card.position }, archivedAt: null },
      { $inc: { position: -1 } },
      { session }
    );
  });

  await invalidate(workspaceId);
  emitToBoard(boardId, SOCKET_EVENT.CARD_ARCHIVED, { id: String(card._id), list: String(card.list) });

  return { archived: String(card._id) };
}

export async function listCards(workspaceId: string, boardId: string, query: ListCardsQuery) {
  await loadBoard(workspaceId, boardId);

  const match: Match = { board: toObjectId(boardId), archivedAt: null };

  if (query.list) {
    match.list = toObjectId(query.list);
  }

  if (query.assignee) {
    match.assignees = toObjectId(query.assignee);
  }

  if (query.label) {
    match.labels = query.label;
  }

  if (query.priority) {
    match.priority = query.priority;
  }

  if (query.overdue) {
    match.dueAt = { $lt: new Date() };
    match.completedAt = null;
  }

  const result = await Card.aggregate([
    { $match: match },
    { $lookup: { from: 'users', localField: 'assignees', foreignField: '_id', as: 'people' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        list: 1,
        position: 1,
        priority: 1,
        labels: 1,
        dueAt: 1,
        completedAt: 1,
        updatedAt: 1,
        assignees: {
          $map: { input: '$people', as: 'person', in: { id: '$$person._id', name: '$$person.name' } }
        }
      }
    },
    { $sort: { updatedAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}
