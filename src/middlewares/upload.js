import crypto from 'node:crypto';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

import busboy from 'busboy';

import ApiError from '../helpers/apiError.js';
import asyncHandler from '../helpers/asyncHandler.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { ALLOWED_UPLOAD_TYPES, FILE_MESSAGES } from '../constants/files.js';

const BYTES_PER_MB = 1024 * 1024;

function safeExtension(filename) {
  const extension = path.extname(filename).toLowerCase();

  return extension.length > 1 && extension.length <= 10 ? extension : '';
}

async function discard(target) {
  if (target) {
    await unlink(target).catch(() => undefined);
  }
}

function receive(req, directory, field) {
  return new Promise((resolve, reject) => {
    const parser = busboy({
      headers: req.headers,
      limits: { files: 1, fields: 12, fileSize: env.MAX_UPLOAD_MB * BYTES_PER_MB }
    });

    const fields = {};
    let writing = Promise.resolve();
    let received = null;
    let failure = null;

    parser.on('field', (name, value) => {
      fields[name] = value;
    });

    parser.on('file', (name, stream, info) => {
      if (name !== field) {
        stream.resume();
        return;
      }

      if (!ALLOWED_UPLOAD_TYPES.has(info.mimeType)) {
        failure = ApiError.badRequest(`${FILE_MESSAGES.TYPE_NOT_ALLOWED}: ${info.mimeType}`);
        stream.resume();
        return;
      }

      const storedName = `${crypto.randomUUID()}${safeExtension(info.filename)}`;
      const target = path.join(directory, storedName);
      const digest = crypto.createHash('sha256');
      let size = 0;

      stream.on('data', (chunk) => {
        size += chunk.length;
        digest.update(chunk);
      });

      stream.on('limit', () => {
        failure = new ApiError(413, FILE_MESSAGES.TOO_LARGE, 'PAYLOAD_TOO_LARGE');
      });

      writing = pipeline(stream, createWriteStream(target)).then(() => {
        received = {
          storedName,
          target,
          size,
          checksum: digest.digest('hex'),
          originalName: info.filename,
          mimeType: info.mimeType
        };
      });
    });

    parser.on('error', reject);

    parser.on('close', async () => {
      try {
        await writing;
      } catch (error) {
        await discard(received?.target);
        reject(error);
        return;
      }

      if (failure) {
        await discard(received?.target);
        reject(failure);
        return;
      }

      if (!received) {
        reject(ApiError.badRequest(FILE_MESSAGES.FILE_REQUIRED));
        return;
      }

      resolve({ file: received, fields });
    });

    req.pipe(parser);
  });
}

export default function streamUpload(field = 'file') {
  return asyncHandler(async (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      throw ApiError.badRequest(FILE_MESSAGES.MULTIPART_REQUIRED);
    }

    const directory = path.join(env.UPLOAD_DIR, String(req.params.workspaceId));
    await mkdir(directory, { recursive: true });

    const { file, fields } = await receive(req, directory, field);

    req.upload = file;
    req.body = { ...req.body, ...fields };

    res.on('finish', async () => {
      if (res.statusCode >= 400) {
        await discard(file.target);
        logger.warn({ file: file.storedName }, 'discarded upload after failed request');
      }
    });

    return next();
  });
}
