import type { Request, RequestHandler, Response } from 'express';

import { AUDIT_ENTITY, type AuditAction, type AuditEntity } from '../constants/audit.js';
import { HTTP_STATUS } from '../constants/statusCodes.js';
import { describeRequest } from '../helpers/requestContext.js';
import { record } from '../services/audit.service.js';

interface AuditPayload {
  id?: string;
  membership?: { id?: string };
  archived?: string | number;
  deleted?: string;
}

function entityIdFrom(req: Request, res: Response): string | null {
  const payload = res.locals.payload as AuditPayload | null | undefined;
  const candidate = payload?.id ?? payload?.membership?.id ?? payload?.archived ?? payload?.deleted;

  if (typeof candidate === 'string') {
    return candidate;
  }

  const params = Object.entries(req.params).filter(([key]) => key !== 'workspaceId');

  return params.length > 0 ? params[params.length - 1][1] : null;
}

export default function auditTrail(action: AuditAction, entityType: AuditEntity): RequestHandler {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= HTTP_STATUS.BAD_REQUEST) {
        return;
      }

      const context = describeRequest(req);
      const entityId = entityIdFrom(req, res);
      const workspace =
        req.workspaceId ?? req.params.workspaceId ?? (entityType === AUDIT_ENTITY.WORKSPACE ? entityId : null);

      void record({
        workspace,
        actor: req.auth?.userId ?? null,
        action,
        entityType,
        entityId,
        metadata: res.locals.auditMetadata ?? null,
        ip: context.ip,
        userAgent: context.userAgent
      });
    });

    next();
  };
}
