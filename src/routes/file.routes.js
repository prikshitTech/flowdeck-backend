import { Router } from 'express';

import * as fileController from '../controllers/file.controller.js';
import auditTrail from '../middlewares/auditTrail.js';
import authenticate from '../middlewares/authenticate.js';
import streamUpload from '../middlewares/upload.js';
import validate from '../middlewares/validate.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../constants/audit.js';
import { WORKSPACE_ROLE } from '../constants/roles.js';
import { requireWorkspaceRole } from '../middlewares/workspaceAccess.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import { fileParamsSchema, listFilesSchema, usageSchema, uploadSchema } from '../validators/file.validator.js';

const router = Router({ mergeParams: true });

const reader = requireWorkspaceRole(WORKSPACE_ROLE.VIEWER);
const writer = requireWorkspaceRole(WORKSPACE_ROLE.MEMBER);

router.use(authenticate);

router.post(
  '/',
  uploadLimiter,
  writer,
  streamUpload('file'),
  validate(uploadSchema),
  auditTrail(AUDIT_ACTION.FILE_UPLOADED, AUDIT_ENTITY.FILE),
  fileController.upload
);

router.get('/', validate(listFilesSchema), reader, fileController.list);
router.get('/usage', validate(usageSchema), reader, fileController.usage);
router.get('/:fileId', validate(fileParamsSchema), reader, fileController.detail);
router.get('/:fileId/download', validate(fileParamsSchema), reader, fileController.download);
router.delete(
  '/:fileId',
  validate(fileParamsSchema),
  writer,
  auditTrail(AUDIT_ACTION.FILE_DELETED, AUDIT_ENTITY.FILE),
  fileController.remove
);

export default router;
