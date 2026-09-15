import mongoose from 'mongoose';

import AuditLog from '../models/auditLog.model.js';
import logger from '../config/logger.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

let sink = async (entry) => {
  await AuditLog.create(entry);
};

export function useAuditSink(handler) {
  sink = handler;
}

export async function record(entry) {
  try {
    await sink(entry);
  } catch (error) {
    logger.error({ err: error, action: entry.action }, 'failed to record audit entry');
  }
}

export async function persist(entry) {
  await AuditLog.create(entry);
}

export async function listEntries(workspaceId, query) {
  const match = { workspace: toObjectId(workspaceId) };

  if (query.action) {
    match.action = query.action;
  }

  if (query.actor) {
    match.actor = toObjectId(query.actor);
  }

  if (query.entityType) {
    match.entityType = query.entityType;
  }

  if (query.from || query.to) {
    match.createdAt = {};

    if (query.from) {
      match.createdAt.$gte = query.from;
    }

    if (query.to) {
      match.createdAt.$lte = query.to;
    }
  }

  const result = await AuditLog.aggregate([
    { $match: match },
    { $lookup: { from: 'users', localField: 'actor', foreignField: '_id', as: 'person' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        action: 1,
        entityType: 1,
        entityId: 1,
        metadata: 1,
        ip: 1,
        createdAt: 1,
        actor: {
          $cond: [
            { $gt: [{ $size: '$person' }, 0] },
            { id: { $first: '$person._id' }, name: { $first: '$person.name' }, email: { $first: '$person.email' } },
            null
          ]
        }
      }
    },
    { $sort: { createdAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function summarise(workspaceId, since) {
  const [summary] = await AuditLog.aggregate([
    { $match: { workspace: toObjectId(workspaceId), createdAt: { $gte: since } } },
    {
      $facet: {
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, action: '$_id', count: 1 } }
        ],
        byActor: [
          { $group: { _id: '$actor', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'person' } },
          {
            $project: {
              _id: 0,
              count: 1,
              actor: { id: '$_id', name: { $first: '$person.name' } }
            }
          }
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, day: '$_id', count: 1 } }
        ],
        total: [{ $count: 'value' }]
      }
    },
    {
      $project: {
        byAction: 1,
        byActor: 1,
        byDay: 1,
        total: { $ifNull: [{ $first: '$total.value' }, 0] }
      }
    }
  ]);

  return summary;
}
