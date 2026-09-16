import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';


import ApiError from '../helpers/apiError.js';
import FileAsset from '../models/fileAsset.model.js';
import env from '../config/env.js';
import { FILE_MESSAGES } from '../constants/files.js';
import { WORKSPACE_ROLE, WORKSPACE_ROLE_RANK } from '../constants/roles.js';
import { paginateStages, sortDirection, unwrapFacet } from '../helpers/pagination.js';
import type { ByteRange } from '../helpers/range.js';
import type { UploadedFile } from '../types/express.js';
import type { WorkspaceRole } from '../constants/roles.js';
import type { ListFilesQuery, UploadInput } from '../validators/file.validator.js';
import { toObjectId } from '../helpers/objectId.js';

type Match = Record<string, unknown>;

export function locate(asset: { workspace: unknown; storedName: string }): string {
  return path.join(env.UPLOAD_DIR, String(asset.workspace), asset.storedName);

}

export async function registerUpload(workspaceId: string, uploaderId: string, upload: UploadedFile, meta: UploadInput = {}) {
  const existing = await FileAsset.findOne({ workspace: workspaceId, checksum: upload.checksum });

  if (existing) {
    await unlink(upload.target).catch(() => undefined);
    return { asset: existing, deduplicated: true };
  }

  const asset = await FileAsset.create({
    workspace: workspaceId,
    uploadedBy: uploaderId,
    originalName: upload.originalName,
    storedName: upload.storedName,
    mimeType: upload.mimeType,
    size: upload.size,
    checksum: upload.checksum,
    entityType: meta.entityType ?? null,
    entityId: meta.entityId ?? null
  });

  return { asset, deduplicated: false };
}

export async function listFiles(workspaceId: string, query: ListFilesQuery) {
  const match: Match = { workspace: toObjectId(workspaceId) };

  if (query.entityType) {
    match.entityType = query.entityType;
  }

  const result = await FileAsset.aggregate([
    { $match: match },
    { $lookup: { from: 'users', localField: 'uploadedBy', foreignField: '_id', as: 'person' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        originalName: 1,
        mimeType: 1,
        size: 1,
        entityType: 1,
        entityId: 1,
        createdAt: 1,
        uploadedBy: { id: { $first: '$person._id' }, name: { $first: '$person.name' } }
      }
    },
    { $sort: { createdAt: sortDirection(query.sort) } },
    ...paginateStages(query)
  ]);

  return unwrapFacet(result, query);
}

export async function getAsset(workspaceId: string, fileId: string) {
  const asset = await FileAsset.findOne({ _id: fileId, workspace: workspaceId });

  if (!asset) {
    throw ApiError.notFound(FILE_MESSAGES.NOT_FOUND);
  }

  return asset;
}

export async function openDownload(workspaceId: string, fileId: string, range: ByteRange | null) {
  const asset = await getAsset(workspaceId, fileId);
  const location = locate(asset);

  const details = await stat(location).catch(() => null);

  if (!details) {
    throw ApiError.notFound(FILE_MESSAGES.NOT_FOUND);
  }

  if (!range) {
    return { asset, size: details.size, stream: createReadStream(location) };
  }

  const start = Math.min(range.start, details.size - 1);
  const end = Math.min(range.end ?? details.size - 1, details.size - 1);

  return {
    asset,
    size: details.size,
    start,
    end,
    partial: true,
    stream: createReadStream(location, { start, end })
  };
}

export async function deleteFile(workspaceId: string, fileId: string, actor: { userId: string; role: WorkspaceRole }) {
  const asset = await getAsset(workspaceId, fileId);
  const isUploader = String(asset.uploadedBy) === String(actor.userId);
  const isManager = WORKSPACE_ROLE_RANK[actor.role] >= WORKSPACE_ROLE_RANK[WORKSPACE_ROLE.ADMIN];

  if (!isUploader && !isManager) {
    throw ApiError.forbidden(FILE_MESSAGES.NOT_OWNER);
  }

  await unlink(locate(asset)).catch(() => undefined);
  await asset.deleteOne();

  return { deleted: String(asset._id) };
}

export async function storageUsage(workspaceId: string) {
  const [usage] = await FileAsset.aggregate([
    { $match: { workspace: toObjectId(workspaceId) } },
    {
      $group: {
        _id: '$mimeType',
        bytes: { $sum: '$size' },
        count: { $sum: 1 }
      }
    },
    { $sort: { bytes: -1 } },
    {
      $group: {
        _id: null,
        totalBytes: { $sum: '$bytes' },
        totalFiles: { $sum: '$count' },
        byType: { $push: { mimeType: '$_id', bytes: '$bytes', count: '$count' } }
      }
    },
    { $project: { _id: 0, totalBytes: 1, totalFiles: 1, byType: 1 } }
  ]);

  return usage ?? { totalBytes: 0, totalFiles: 0, byType: [] };
}
