import { ERROR_CODE, HTTP_STATUS } from '../constants/statusCodes.js';

export default class ApiError extends Error {
  constructor(statusCode, message, code = ERROR_CODE.INTERNAL, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expected = true;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message, code = ERROR_CODE.VALIDATION_FAILED, details = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, code, details);
  }

  static unauthorized(message, code = ERROR_CODE.UNAUTHENTICATED) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  static forbidden(message, code = ERROR_CODE.FORBIDDEN) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, code);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODE.RESOURCE_NOT_FOUND);
  }

  static conflict(message) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, ERROR_CODE.DUPLICATE_RESOURCE);
  }

  static unprocessable(message, details = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, ERROR_CODE.VALIDATION_FAILED, details);
  }

  static tooManyRequests(message, details = null) {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, ERROR_CODE.RATE_LIMITED, details);
  }
}
