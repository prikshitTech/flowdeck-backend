
import ApiError from '../helpers/apiError.js';
import Board from '../models/board.model.js';
import Channel from '../models/channel.model.js';
import ChannelMember from '../models/channelMember.model.js';
import Page from '../models/page.model.js';
import { CHANNEL_VISIBILITY } from '../constants/channel.js';
import { SEARCH_MESSAGES } from '../constants/messages.js';
import { buildMeta, toSkip } from '../helpers/pagination.js';
import { prefixPattern, toTextQuery } from '../helpers/search.js';
import type { PipelineStage, Types } from 'mongoose';
import type { SearchQuery } from '../validators/insight.validator.js';
import { toObjectId } from '../helpers/objectId.js';

const SNIPPET_LENGTH = 180;
const SUGGESTION_LIMIT = 8;


type UnionStage = Exclude<PipelineStage, PipelineStage.Out | PipelineStage.Merge>;

interface SearchFacet {
  items: Record<string, unknown>[];
  counts: { _id: string; count: number }[];
  total: number;
}

async function visibleChannelIds(workspaceId: string, userId: string, unrestricted = false) {
  if (unrestricted) {
    const all = await Channel.find({ workspace: workspaceId, archivedAt: null }).select('_id').lean();
    return all.map((row) => toObjectId(row._id));
  }

  const [publicChannels, joined] = await Promise.all([
    Channel.find({ workspace: workspaceId, visibility: CHANNEL_VISIBILITY.PUBLIC, archivedAt: null })
      .select('_id')
      .lean(),
    ChannelMember.find({ workspace: workspaceId, user: userId }).select('channel').lean()
  ]);

  const ids = new Set(publicChannels.map((row) => String(row._id)));

  for (const row of joined) {
    ids.add(String(row.channel));
  }

  return [...ids].map(toObjectId);
}

function pageStage(workspaceId: Types.ObjectId, text: string): UnionStage[] {
  return [
    { $match: { workspace: workspaceId, archivedAt: null, $text: { $search: text } } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        kind: 'page',
        title: '$title',
        snippet: { $substrCP: ['$body', 0, SNIPPET_LENGTH] },
        parentId: '$parent',
        updatedAt: 1,
        score: { $meta: 'textScore' }
      }
    }
  ];
}

function cardStage(workspaceId: Types.ObjectId, text: string): UnionStage[] {
  return [
    { $match: { workspace: workspaceId, archivedAt: null, $text: { $search: text } } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        kind: 'card',
        title: '$title',
        snippet: { $substrCP: ['$description', 0, SNIPPET_LENGTH] },
        parentId: '$board',
        updatedAt: 1,
        score: { $meta: 'textScore' }
      }
    }
  ];
}

function messageStage(workspaceId: Types.ObjectId, text: string, channelIds: Types.ObjectId[]): UnionStage[] {
  return [
    {
      $match: {
        workspace: workspaceId,
        channel: { $in: channelIds },
        deletedAt: null,
        $text: { $search: text }
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        kind: 'message',
        title: { $substrCP: ['$body', 0, 60] },
        snippet: { $substrCP: ['$body', 0, SNIPPET_LENGTH] },
        parentId: '$channel',
        updatedAt: '$createdAt',
        score: { $meta: 'textScore' }
      }
    }
  ];
}

export async function searchWorkspace(workspaceId: string, userId: string, query: SearchQuery, unrestricted = false) {
  const text = toTextQuery(query.q);

  if (!text) {
    throw ApiError.badRequest(SEARCH_MESSAGES.QUERY_TOO_SHORT);
  }

  const id = toObjectId(workspaceId);
  const kinds = query.kinds ?? ['page', 'card', 'message'];
  const unions: PipelineStage.UnionWith[] = [];

  if (kinds.includes('card')) {
    unions.push({ $unionWith: { coll: 'cards', pipeline: cardStage(id, text) } });
  }

  if (kinds.includes('message')) {
    const channelIds = await visibleChannelIds(workspaceId, userId, unrestricted);
    unions.push({ $unionWith: { coll: 'messages', pipeline: messageStage(id, text, channelIds) } });
  }

  const leading: PipelineStage[] = kinds.includes('page')
    ? pageStage(id, text)
    : [{ $match: { _id: null } }, { $project: { _id: 0 } }];

  const [result] = await Page.aggregate<SearchFacet>([
    ...leading,
    ...unions,
    {
      $facet: {
        items: [{ $sort: { score: -1, updatedAt: -1 } }, { $skip: toSkip(query) }, { $limit: query.limit }],
        counts: [{ $group: { _id: '$kind', count: { $sum: 1 } } }],
        total: [{ $count: 'value' }]
      }
    },
    {
      $project: {
        items: 1,
        counts: 1,
        total: { $ifNull: [{ $first: '$total.value' }, 0] }
      }
    }
  ]);

  const byKind = Object.fromEntries((result?.counts ?? []).map((row) => [row._id, row.count]));

  return {
    items: result?.items ?? [],
    pagination: buildMeta(query, result?.total ?? 0),
    byKind
  };
}

export async function suggest(workspaceId: string, userId: string, term: string, unrestricted = false) {
  const pattern = prefixPattern(term);
  const id = toObjectId(workspaceId);

  const [pages, boards, channels] = await Promise.all([
    Page.find({ workspace: id, archivedAt: null, title: pattern })
      .select('title')
      .limit(SUGGESTION_LIMIT)
      .lean(),
    Board.find({ workspace: id, archivedAt: null, name: pattern })
      .select('name')
      .limit(SUGGESTION_LIMIT)
      .lean(),
    Channel.find({ workspace: id, archivedAt: null, name: pattern })
      .select('name visibility')
      .limit(SUGGESTION_LIMIT)
      .lean()
  ]);

  const visible = new Set((await visibleChannelIds(workspaceId, userId, unrestricted)).map(String));

  return [
    ...pages.map((row) => ({ id: String(row._id), kind: 'page', label: row.title })),
    ...boards.map((row) => ({ id: String(row._id), kind: 'board', label: row.name })),
    ...channels
      .filter((row) => visible.has(String(row._id)))
      .map((row) => ({ id: String(row._id), kind: 'channel', label: row.name }))
  ].slice(0, SUGGESTION_LIMIT);
}
