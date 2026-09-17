import { Queue, type RepeatOptions } from 'bullmq';

import logger from '../config/logger.js';
import env from '../config/env.js';
import { createRedisClient, redis } from '../config/redis.js';
import { JOB_DEFAULTS, QUEUE, type QueueName } from '../constants/queues.js';

interface EnqueueOptions<T> {
  runInline?: (payload: T) => Promise<unknown>;
}

const queues = new Map<QueueName, Queue>();

let consumersRunning = !env.RUN_WORKERS_IN_API;

export function markConsumersRunning(running: boolean): void {
  consumersRunning = running;
}

export function queueConnection() {
  return createRedisClient({ maxRetriesPerRequest: null, enableOfflineQueue: false });
}

function queueFor(name: QueueName): Queue {
  const existing = queues.get(name);

  if (existing) {
    return existing;
  }

  const queue = new Queue(name, { connection: queueConnection(), defaultJobOptions: JOB_DEFAULTS });

  queue.on('error', (error) => logger.warn({ err: error, queue: name }, 'queue connection problem'));
  queues.set(name, queue);

  return queue;
}

export async function enqueue<T>(
  name: QueueName,
  jobName: string,
  payload: T,
  { runInline }: EnqueueOptions<T> = {}
): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      throw new Error('redis is not connected');
    }

    if (!consumersRunning) {
      throw new Error('no queue workers are running to pick the job up');
    }

    await queueFor(name).add(jobName, payload);
    return true;
  } catch (error) {
    logger.debug({ err: error, queue: name, job: jobName }, 'could not enqueue job, handling inline');

    if (runInline) {
      await runInline(payload);
    }

    return false;
  }
}

export async function scheduleRepeatable(name: QueueName, jobName: string, repeat: RepeatOptions): Promise<void> {
  try {
    await queueFor(name).upsertJobScheduler(jobName, repeat, { name: jobName, data: {} });
    logger.info({ queue: name, job: jobName }, 'repeatable job scheduled');
  } catch (error) {
    logger.warn({ err: error, job: jobName }, 'could not schedule repeatable job');
  }
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}

export const auditQueue = () => queueFor(QUEUE.AUDIT);
export const notificationQueue = () => queueFor(QUEUE.NOTIFICATION);
export const maintenanceQueue = () => queueFor(QUEUE.MAINTENANCE);
