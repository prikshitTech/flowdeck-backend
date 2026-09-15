import { Queue } from 'bullmq';

import logger from '../config/logger.js';
import { createRedisClient } from '../config/redis.js';
import { JOB_DEFAULTS, QUEUE } from '../constants/queues.js';

const queues = new Map();

export function queueConnection() {
  return createRedisClient({ maxRetriesPerRequest: null, enableOfflineQueue: false });
}

function queueFor(name) {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection: queueConnection(), defaultJobOptions: JOB_DEFAULTS });

    queue.on('error', (error) => logger.warn({ err: error, queue: name }, 'queue connection problem'));
    queues.set(name, queue);
  }

  return queues.get(name);
}

export async function enqueue(name, jobName, payload, { runInline } = {}) {
  try {
    await queueFor(name).add(jobName, payload);
    return true;
  } catch (error) {
    logger.warn({ err: error, queue: name, job: jobName }, 'could not enqueue job, handling inline');

    if (runInline) {
      await runInline(payload);
    }

    return false;
  }
}

export async function scheduleRepeatable(name, jobName, repeat) {
  try {
    await queueFor(name).add(jobName, {}, { repeat, jobId: jobName });
    logger.info({ queue: name, job: jobName }, 'repeatable job scheduled');
  } catch (error) {
    logger.warn({ err: error, job: jobName }, 'could not schedule repeatable job');
  }
}

export async function closeQueues() {
  await Promise.allSettled([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}

export const auditQueue = () => queueFor(QUEUE.AUDIT);
export const notificationQueue = () => queueFor(QUEUE.NOTIFICATION);
export const maintenanceQueue = () => queueFor(QUEUE.MAINTENANCE);
