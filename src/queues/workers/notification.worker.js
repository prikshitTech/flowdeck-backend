import { JOB } from '../../constants/queues.js';
import { fanOutAssignment, fanOutMention } from '../../services/notification.service.js';

const handlers = {
  [JOB.MENTION_FAN_OUT]: fanOutMention,
  [JOB.CARD_ASSIGNED]: fanOutAssignment
};

export default async function handleNotificationJob(job) {
  const handler = handlers[job.name];

  if (!handler) {
    return { skipped: job.name };
  }

  const created = await handler(job.data);
  return { delivered: created.length };
}
