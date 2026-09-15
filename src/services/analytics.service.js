import mongoose from 'mongoose';

import Board from '../models/board.model.js';
import Card from '../models/card.model.js';
import Membership from '../models/membership.model.js';
import Message from '../models/message.model.js';
import Page from '../models/page.model.js';
import { CACHE_TTL, cacheKey } from '../constants/cacheKeys.js';
import { remember } from './cache.service.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function dayBuckets(dateField) {
  return [
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: dateField } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: '$_id', count: 1 } }
  ];
}

export async function workspaceOverview(workspaceId, days) {
  return remember(cacheKey.workspaceAnalytics(workspaceId, days), CACHE_TTL.MEDIUM, async () => {
    const id = toObjectId(workspaceId);
    const since = new Date(Date.now() - days * DAY_IN_MS);

    const [pages, cards, messages, members] = await Promise.all([
      Page.aggregate([
        { $match: { workspace: id } },
        {
          $facet: {
            total: [{ $match: { archivedAt: null } }, { $count: 'value' }],
            created: [{ $match: { createdAt: { $gte: since } } }, ...dayBuckets('$createdAt')]
          }
        },
        { $project: { total: { $ifNull: [{ $first: '$total.value' }, 0] }, created: 1 } }
      ]),
      Card.aggregate([
        { $match: { workspace: id } },
        {
          $facet: {
            open: [{ $match: { archivedAt: null, completedAt: null } }, { $count: 'value' }],
            completed: [{ $match: { archivedAt: null, completedAt: { $ne: null } } }, { $count: 'value' }],
            overdue: [
              { $match: { archivedAt: null, completedAt: null, dueAt: { $lt: new Date() } } },
              { $count: 'value' }
            ],
            byPriority: [
              { $match: { archivedAt: null } },
              { $group: { _id: '$priority', count: { $sum: 1 } } },
              { $project: { _id: 0, priority: '$_id', count: 1 } }
            ],
            cycleTime: [
              { $match: { completedAt: { $ne: null } } },
              { $project: { hours: { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 3600000] } } },
              { $group: { _id: null, average: { $avg: '$hours' } } }
            ]
          }
        },
        {
          $project: {
            open: { $ifNull: [{ $first: '$open.value' }, 0] },
            completed: { $ifNull: [{ $first: '$completed.value' }, 0] },
            overdue: { $ifNull: [{ $first: '$overdue.value' }, 0] },
            byPriority: 1,
            averageCycleHours: { $round: [{ $ifNull: [{ $first: '$cycleTime.average' }, 0] }, 1] }
          }
        }
      ]),
      Message.aggregate([
        { $match: { workspace: id, deletedAt: null, createdAt: { $gte: since } } },
        {
          $facet: {
            total: [{ $count: 'value' }],
            perDay: dayBuckets('$createdAt')
          }
        },
        { $project: { total: { $ifNull: [{ $first: '$total.value' }, 0] }, perDay: 1 } }
      ]),
      Membership.aggregate([
        { $match: { workspace: id } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $project: { _id: 0, role: '$_id', count: 1 } }
      ])
    ]);

    return {
      since,
      pages: pages[0] ?? { total: 0, created: [] },
      cards: cards[0] ?? { open: 0, completed: 0, overdue: 0, byPriority: [], averageCycleHours: 0 },
      messages: messages[0] ?? { total: 0, perDay: [] },
      membersByRole: members
    };
  });
}

export async function boardThroughput(workspaceId, boardId) {
  const [board] = await Board.aggregate([
    { $match: { _id: toObjectId(boardId), workspace: toObjectId(workspaceId) } },
    {
      $lookup: {
        from: 'cards',
        let: { boardId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$board', '$$boardId'] }, archivedAt: null } },
          {
            $group: {
              _id: '$list',
              cards: { $sum: 1 },
              completed: { $sum: { $cond: ['$completedAt', 1, 0] } },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$dueAt', null] },
                        { $lt: ['$dueAt', new Date()] },
                        { $eq: ['$completedAt', null] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          },
          { $lookup: { from: 'boardlists', localField: '_id', foreignField: '_id', as: 'list' } },
          {
            $project: {
              _id: 0,
              list: { $first: '$list.name' },
              position: { $first: '$list.position' },
              cards: 1,
              completed: 1,
              overdue: 1
            }
          },
          { $sort: { position: 1 } }
        ],
        as: 'lists'
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        lists: 1,
        totalCards: { $sum: '$lists.cards' },
        totalCompleted: { $sum: '$lists.completed' }
      }
    }
  ]);

  if (!board) {
    return null;
  }

  return {
    ...board,
    completionRate: board.totalCards === 0 ? 0 : Math.round((board.totalCompleted / board.totalCards) * 100)
  };
}

export async function memberActivity(workspaceId, days) {
  const id = toObjectId(workspaceId);
  const since = new Date(Date.now() - days * DAY_IN_MS);

  return Membership.aggregate([
    { $match: { workspace: id } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'person' } },
    { $unwind: '$person' },
    {
      $lookup: {
        from: 'messages',
        let: { userId: '$user' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$author', '$$userId'] }, { $eq: ['$workspace', id] }] },
              deletedAt: null,
              createdAt: { $gte: since }
            }
          },
          { $count: 'value' }
        ],
        as: 'messages'
      }
    },
    {
      $lookup: {
        from: 'pages',
        let: { userId: '$user' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$updatedBy', '$$userId'] }, { $eq: ['$workspace', id] }] },
              updatedAt: { $gte: since }
            }
          },
          { $count: 'value' }
        ],
        as: 'pageEdits'
      }
    },
    {
      $lookup: {
        from: 'cards',
        let: { userId: '$user' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $in: ['$$userId', '$assignees'] }, { $eq: ['$workspace', id] }] },
              archivedAt: null,
              completedAt: { $ne: null }
            }
          },
          { $count: 'value' }
        ],
        as: 'cardsDone'
      }
    },
    {
      $project: {
        _id: 0,
        user: { id: '$person._id', name: '$person.name', email: '$person.email' },
        role: 1,
        messages: { $ifNull: [{ $first: '$messages.value' }, 0] },
        pageEdits: { $ifNull: [{ $first: '$pageEdits.value' }, 0] },
        cardsCompleted: { $ifNull: [{ $first: '$cardsDone.value' }, 0] }
      }
    },
    {
      $addFields: {
        activityScore: { $add: ['$messages', { $multiply: ['$pageEdits', 2] }, { $multiply: ['$cardsCompleted', 3] }] }
      }
    },
    { $sort: { activityScore: -1 } }
  ]);
}
