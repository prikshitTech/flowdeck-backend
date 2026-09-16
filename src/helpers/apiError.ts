import { ERROR_CODE, HTTP_STATUS, type ErrorCode } from '../constants/statusCodes.js';

export default class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  readonly expected = true;

  constructor(statusCode: number, message: string, code: string = ERROR_CODE.INTERNAL, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message: string, code: ErrorCode = ERROR_CODE.VALIDATION_FAILED, details: unknown = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, code, details);
  }

  static unauthorized(message: string, code: ErrorCode = ERROR_CODE.UNAUTHENTICATED) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  static forbidden(message: string, code: ErrorCode = ERROR_CODE.FORBIDDEN) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, code);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODE.RESOURCE_NOT_FOUND);
  }

  static conflict(message: string) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODE.DUPLICATE_RESOURCE);
  }

  static unprocessable(message: string, details: unknown = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, ERROR_CODE.VALIDATION_FAILED, details);
  }

  static tooManyRequests(message: string, details: unknown = null) {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, ERROR_CODE.RATE_LIMITED, details);
  }
}
