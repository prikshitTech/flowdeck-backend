import type { RequestHandler, Response } from 'express';

import { HTTP_STATUS } from '../constants/statusCodes.js';
import { COMMON_MESSAGES } from '../constants/messages.js';

interface SuccessBody {
  success: boolean;
  message: string;
  data: unknown;
  meta?: Record<string, unknown>;
}

function build(res: Response, statusCode: number, message: string, data: unknown, meta?: Record<string, unknown>) {
  res.locals.payload = data;

  const body: SuccessBody = { success: statusCode < HTTP_STATUS.BAD_REQUEST, message, data };

  if (meta) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
}

const responder: RequestHandler = (_req, res, next) => {
  res.ok = (data = null, message = COMMON_MESSAGES.FETCHED) => build(res, HTTP_STATUS.OK, message, data);

  res.created = (data = null, message = COMMON_MESSAGES.CREATED) => build(res, HTTP_STATUS.CREATED, message, data);

  res.accepted = (data = null, message = 'Request accepted for processing') =>
    build(res, HTTP_STATUS.ACCEPTED, message, data);

  res.noContent = () => res.status(HTTP_STATUS.NO_CONTENT).end();

  res.list = (items, pagination, message = COMMON_MESSAGES.FETCHED) =>
    build(res, HTTP_STATUS.OK, message, items, { pagination });

  res.failure = (statusCode, message, payload = null) => build(res, statusCode, message, payload);

  next();
};

export default responder;
