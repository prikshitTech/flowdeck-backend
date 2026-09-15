import { AUDIT_ENTITY } from '../constants/audit.js';
import { HTTP_STATUS } from '../constants/statusCodes.js';
import { describeRequest } from '../helpers/requestContext.js';
import { record } from '../services/audit.service.js';

function entityIdFrom(req, res) {
  const payload = res.locals.payload;
  const candidate = payload?.id ?? payload?.membership?.id ?? payload?.archived ?? payload?.deleted;

  if (candidate) {
    return candidate;
  }

  const params = Object.entries(req.params).filter(([key]) => key !== 'workspaceId');

  return params.length > 0 ? params.at(-1)[1] : null;
}

export default function auditTrail(action, entityType) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= HTTP_STATUS.BAD_REQUEST) {
        return;
      }

      const context = describeRequest(req);
      const entityId = entityIdFrom(req, res);
      const workspace =
        req.workspaceId ??
        req.params.workspaceId ??
        (entityType === AUDIT_ENTITY.WORKSPACE ? entityId : null);

      record({
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
