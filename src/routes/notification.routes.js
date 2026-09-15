import { Router } from 'express';

import * as notificationController from '../controllers/notification.controller.js';
import authenticate from '../middlewares/authenticate.js';
import validate from '../middlewares/validate.js';
import {
  listNotificationsSchema,
  markAllReadSchema,
  notificationParamsSchema
} from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listNotificationsSchema), notificationController.list);
router.get('/unread-count', notificationController.unread);
router.patch('/:notificationId/read', validate(notificationParamsSchema), notificationController.markRead);
router.post('/read-all', validate(markAllReadSchema), notificationController.markAllRead);

export default router;
