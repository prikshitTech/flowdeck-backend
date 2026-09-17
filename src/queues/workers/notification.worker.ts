import type { Job } from 'bullmq';

import { JOB } from '../../constants/queues.js';
import { deliver, type NotificationDraft } from '../../services/notification.service.js';

export default async function handleNotificationJob(job: Job<NotificationDraft>) {
  if (job.name !== JOB.DELIVER_NOTIFICATION) {
    return { skipped: job.name };
  }

  const created = await deliver(job.data);
  return { delivered: created.length };
}
