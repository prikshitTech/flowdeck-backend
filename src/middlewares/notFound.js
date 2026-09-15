import ApiError from '../helpers/apiError.js';
import { COMMON_MESSAGES } from '../constants/messages.js';

export default function notFound(req, res, next) {
  next(ApiError.notFound(`${COMMON_MESSAGES.ROUTE_NOT_FOUND}: ${req.method} ${req.originalUrl}`));
}
