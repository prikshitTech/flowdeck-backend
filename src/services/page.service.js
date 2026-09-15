import mongoose from 'mongoose';

import ApiError from '../helpers/apiError.js';
import Page from '../models/page.model.js';
import PageRevision from '../models/pageRevision.model.js';
import { CACHE_TTL, cacheKey } from '../constants/cacheKeys.js';
import { PAGE_MESSAGES } from '../constants/messages.js';
import { SOCKET_EVENT } from '../constants/events.js';
import { dropByPrefix, remember } from './cache.service.js';
import { emitToWorkspace } from '../sockets/emitter.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import { withId, withIds } from '../helpers/present.js';
import { withTransaction } from '../helpers/transaction.js';

const MAX_DEPTH = 8;

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

function invalidate(workspaceId) {
  return dropByPrefix(cacheKey.workspaceTag(workspaceId));
}

async function loadPage(workspaceId, pageId) {
  const page = await Page.findOne({ _id: pageId, workspace: workspaceId });

  if (!page || page.archivedAt) {
    throw ApiError.notFound(PAGE_MESSAGES.NOT_FOUND);
  }

  return page;
}

async function resolveParent(workspaceId, parentId) {
  if (!parentId) {
    return { parent: null, path: [] };
  }

  const parent = await loadPage(workspaceId, parentId);

  if (parent.path.length >= MAX_DEPTH) {
    throw ApiError.badRequest(PAGE_MESSAGES.TOO_DEEP);
  }

  return { parent: parent._id, path: [...parent.path, parent._id] };
}

function nest(rows) {
  const byId = new Map(rows.map((row) => [String(row.id), { ...row, children: [] }]));
  const roots = [];

  for (const node of byId.values()) {
    const parent = node.parent ? byId.get(String(node.parent)) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createPage(workspaceId, authorId, payload) {
  const { parent, path } = await resolveParent(workspaceId, payload.parent);

  const siblings = await Page.countDocuments({ workspace: workspaceId, parent, archivedAt: null });

  const page = await Page.create({
    workspace: workspaceId,
    parent,
    path,
    title: payload.title,
    body: payload.body ?? '',
    icon: payload.icon ?? null,
    position: siblings,
    createdBy: authorId,
    updatedBy: authorId
  });

  await invalidate(workspaceId);
  return page;
}

export async function listPages(workspaceId, query) {
  const match = { workspace: toObjectId(workspaceId), archivedAt: null };

  if (query.parent) {
    match.parent = toObjectId(query.parent);
  }

  const result = await Page.aggregate([
    { $match: match },
    { $lookup: { from: 'users', localField: 'updatedBy', foreignField: '_id', as: 'editor' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        icon: 1,
        parent: 1,
        position: 1,
        version: 1,
        updatedAt: 1,
        depth: { $size: '$path' },
        updatedBy: { $first: '$editor.name' }
      }
    },
    { $sort: { updatedAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function pageTree(workspaceId) {
  return remember(cacheKey.pageTree(workspaceId), CACHE_TTL.SHORT, async () => {
    const rows = await Page.aggregate([
      { $match: { workspace: toObjectId(workspaceId), archivedAt: null } },
      { $sort: { position: 1, createdAt: 1 } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          parent: 1,
          title: 1,
          icon: 1,
          position: 1,
          depth: { $size: '$path' }
        }
      }
    ]);

    return nest(rows.map((row) => ({ ...row, id: String(row.id), parent: row.parent ? String(row.parent) : null })));
  });
}

export async function getPage(workspaceId, pageId) {
  const page = await Page.findOne({ _id: pageId, workspace: workspaceId, archivedAt: null })
    .populate('createdBy updatedBy', 'name email avatarUrl')
    .lean();

  if (!page) {
    throw ApiError.notFound(PAGE_MESSAGES.NOT_FOUND);
  }

  const breadcrumb = await Page.find({ _id: { $in: page.path } }).select('title').lean();

  return { ...withId(page), breadcrumb: withIds(breadcrumb) };
}

export async function updatePage(workspaceId, pageId, editorId, payload) {
  const page = await loadPage(workspaceId, pageId);

  const updated = await withTransaction(async (session) => {
    await PageRevision.create(
      [
        {
          page: page._id,
          workspace: workspaceId,
          version: page.version,
          title: page.title,
          body: page.body,
          editedBy: page.updatedBy ?? page.createdBy
        }
      ],
      { session }
    );

    page.set({ ...payload, updatedBy: editorId, version: page.version + 1 });
    await page.save({ session });

    return page;
  });

  await invalidate(workspaceId);
  emitToWorkspace(workspaceId, SOCKET_EVENT.PAGE_UPDATED, {
    id: String(updated._id),
    title: updated.title,
    version: updated.version
  });

  return updated;
}

export async function movePage(workspaceId, pageId, { parent: nextParentId, position }) {
  const page = await loadPage(workspaceId, pageId);

  if (nextParentId && String(nextParentId) === String(pageId)) {
    throw ApiError.badRequest(PAGE_MESSAGES.CANNOT_NEST_IN_SELF);
  }

  const descendants = await Page.find({ workspace: workspaceId, path: page._id }).select('path');

  if (nextParentId && descendants.some((child) => String(child._id) === String(nextParentId))) {
    throw ApiError.badRequest(PAGE_MESSAGES.CANNOT_NEST_IN_DESCENDANT);
  }

  const { parent, path } = await resolveParent(workspaceId, nextParentId);
  const cutoff = page.path.length;

  await withTransaction(async (session) => {
    page.set({ parent, path, position: position ?? page.position });
    await page.save({ session });

    if (descendants.length > 0) {
      await Page.bulkWrite(
        descendants.map((child) => ({
          updateOne: {
            filter: { _id: child._id },
            update: { $set: { path: [...path, page._id, ...child.path.slice(cutoff + 1)] } }
          }
        })),
        { session }
      );
    }
  });

  await invalidate(workspaceId);
  return page;
}

export async function reorderPages(workspaceId, entries) {
  await Page.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: { _id: entry.page, workspace: workspaceId },
        update: { $set: { position: entry.position } }
      }
    }))
  );

  await invalidate(workspaceId);
  return { reordered: entries.length };
}

export async function archivePage(workspaceId, pageId) {
  const page = await loadPage(workspaceId, pageId);
  const archivedAt = new Date();

  const affected = await withTransaction(async (session) => {
    const result = await Page.updateMany(
      { workspace: workspaceId, $or: [{ _id: page._id }, { path: page._id }], archivedAt: null },
      { $set: { archivedAt } },
      { session }
    );

    return result.modifiedCount;
  });

  await invalidate(workspaceId);
  return { archived: affected };
}

export async function listRevisions(workspaceId, pageId, query) {
  await loadPage(workspaceId, pageId);

  const result = await PageRevision.aggregate([
    { $match: { page: toObjectId(pageId) } },
    { $lookup: { from: 'users', localField: 'editedBy', foreignField: '_id', as: 'editor' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        version: 1,
        title: 1,
        createdAt: 1,
        editedBy: { $first: '$editor.name' }
      }
    },
    { $sort: { version: -1 } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function restoreRevision(workspaceId, pageId, version, editorId) {
  const page = await loadPage(workspaceId, pageId);
  const revision = await PageRevision.findOne({ page: page._id, version });

  if (!revision) {
    throw ApiError.notFound(PAGE_MESSAGES.REVISION_NOT_FOUND);
  }

  const restored = await withTransaction(async (session) => {
    await PageRevision.create(
      [
        {
          page: page._id,
          workspace: workspaceId,
          version: page.version,
          title: page.title,
          body: page.body,
          editedBy: page.updatedBy ?? page.createdBy
        }
      ],
      { session }
    );

    page.set({
      title: revision.title,
      body: revision.body,
      updatedBy: editorId,
      version: page.version + 1
    });

    await page.save({ session });
    return page;
  });

  await invalidate(workspaceId);
  return restored;
}
