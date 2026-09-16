import type { RequestHandler } from 'express';

import ApiError from '../helpers/apiError.js';
import { COMMON_MESSAGES } from '../constants/messages.js';

const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`${COMMON_MESSAGES.ROUTE_NOT_FOUND}: ${req.method} ${req.originalUrl}`));
};

export default notFound;
