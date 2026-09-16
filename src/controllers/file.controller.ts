import asyncHandler from '../helpers/asyncHandler.js';
import * as fileService from '../services/file.service.js';
import { COMMON_MESSAGES } from '../constants/messages.js';
import { FILE_MESSAGES } from '../constants/files.js';
import { HTTP_STATUS } from '../constants/statusCodes.js';
import { parseRange } from '../helpers/range.js';
import { validQuery } from '../middlewares/validate.js';
import type { ListFilesQuery } from '../validators/file.validator.js';

export const upload = asyncHandler(async (req, res) => {
  const { asset, deduplicated } = await fileService.registerUpload(
    req.workspaceId,
    req.auth.userId,
    req.upload,
    req.body
  );

  res.created({ ...asset.toJSON(), deduplicated }, FILE_MESSAGES.UPLOADED);
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await fileService.listFiles(req.workspaceId, validQuery<ListFilesQuery>(req));

  res.list(items, pagination);
});

export const detail = asyncHandler(async (req, res) => {
  const asset = await fileService.getAsset(req.workspaceId, req.params.fileId);

  res.ok(asset, COMMON_MESSAGES.FETCHED);
});

export const download = asyncHandler(async (req, res) => {
  const range = parseRange(req.get('range'));
  const result = await fileService.openDownload(req.workspaceId, req.params.fileId, range);

  res.setHeader('Content-Type', result.asset.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.asset.originalName)}"`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');

  if (result.partial) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${result.start}-${result.end}/${result.size}`);
    res.setHeader('Content-Length', result.end - result.start + 1);
  } else {
    res.status(HTTP_STATUS.OK);
    res.setHeader('Content-Length', result.size);
  }

  result.stream.pipe(res);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await fileService.deleteFile(req.workspaceId, req.params.fileId, {
    userId: req.auth.userId,
    role: req.membership.role
  });

  res.ok(result, FILE_MESSAGES.DELETED);
});

export const usage = asyncHandler(async (req, res) => {
  const result = await fileService.storageUsage(req.workspaceId);

  res.ok(result, COMMON_MESSAGES.FETCHED);
});
