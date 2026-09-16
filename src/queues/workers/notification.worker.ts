import type { Job } from 'bullmq';

import { JOB } from '../../constants/queues.js';
import { fanOutAssignment, fanOutMention } from '../../services/notification.service.js';

export default async function handleNotificationJob(job: Job) {
  if (job.name === JOB.MENTION_FAN_OUT) {
    const created = await fanOutMention(job.data);
    return { delivered: created.length };
  }

  if (job.name === JOB.CARD_ASSIGNED) {
    const created = await fanOutAssignment(job.data);
    return { delivered: created.length };
  }

  return { skipped: job.name };
}
