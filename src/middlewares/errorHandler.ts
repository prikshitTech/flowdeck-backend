import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import ApiError from '../helpers/apiError.js';
import logger from '../config/logger.js';
import { isProduction } from '../config/env.js';
import { COMMON_MESSAGES } from '../constants/messages.js';
import { ERROR_CODE, HTTP_STATUS } from '../constants/statusCodes.js';

const DUPLICATE_KEY = 11000;

interface DriverError {
  code?: number;
  keyPattern?: Record<string, unknown>;
  type?: string;
  stack?: string;
}

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  details: unknown;
  stack?: string;
}

function translate(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    return ApiError.unprocessable(COMMON_MESSAGES.VALIDATION_FAILED, details);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
    return ApiError.unprocessable(COMMON_MESSAGES.VALIDATION_FAILED, details);
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(COMMON_MESSAGES.INVALID_IDENTIFIER, ERROR_CODE.INVALID_IDENTIFIER);
  }

  const driverError = error as DriverError | null;

  if (driverError?.code === DUPLICATE_KEY) {
    const field = Object.keys(driverError.keyPattern ?? {}).join(', ');
    return ApiError.conflict(field ? `${field} is already taken` : COMMON_MESSAGES.DUPLICATE_RESOURCE);
  }

  if (driverError?.type === 'entity.too.large') {
    return new ApiError(HTTP_STATUS.PAYLOAD_TOO_LARGE, 'Request body is too large', ERROR_CODE.VALIDATION_FAILED);
  }

  return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, COMMON_MESSAGES.INTERNAL_ERROR, ERROR_CODE.INTERNAL);
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalized = translate(error);

  if (normalized.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error({ err: error, path: req.originalUrl, method: req.method }, 'unhandled request failure');
  }

  const body: ErrorBody = {
    success: false,
    message: normalized.message,
    code: normalized.code,
    details: normalized.details
  };

  if (!isProduction && normalized.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    body.stack = (error as DriverError | null)?.stack;
  }

  res.status(normalized.statusCode).json(body);
};

export default errorHandler;
