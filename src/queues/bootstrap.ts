import { Worker, type Processor } from 'bullmq';

import handleAuditJob from './workers/audit.worker.js';
import handleMaintenanceJob from './workers/maintenance.worker.js';
import handleNotificationJob from './workers/notification.worker.js';
import logger from '../config/logger.js';
import { JOB, QUEUE, REPEATABLE, type QueueName } from '../constants/queues.js';
import { closeQueues, enqueue, markConsumersRunning, queueConnection, scheduleRepeatable } from './index.js';
import { persist, useAuditSink } from '../services/audit.service.js';

const WORKER_CONCURRENCY = 5;

const definitions: { name: QueueName; processor: Processor }[] = [
  { name: QUEUE.AUDIT, processor: handleAuditJob },
  { name: QUEUE.NOTIFICATION, processor: handleNotificationJob },
  { name: QUEUE.MAINTENANCE, processor: handleMaintenanceJob }
];

const workers: Worker[] = [];

export function routeAuditsThroughQueue(): void {
  useAuditSink((entry) => enqueue(QUEUE.AUDIT, JOB.AUDIT_ENTRY, entry, { runInline: persist }));
}

export function startWorkers(): Worker[] {
  for (const { name, processor } of definitions) {
    const worker = new Worker(name, processor, {
      connection: queueConnection(),
      concurrency: WORKER_CONCURRENCY
    });

    worker.on('failed', (job, error) => logger.error({ err: error, queue: name, job: job?.name }, 'job failed'));
    worker.on('error', (error) => logger.warn({ err: error, queue: name }, 'worker connection problem'));

    workers.push(worker);
  }

  markConsumersRunning(true);
  logger.info(`${workers.length} queue workers started`);
  return workers;
}

export async function scheduleRecurringJobs(): Promise<void> {
  for (const [jobName, repeat] of Object.entries(REPEATABLE)) {
    await scheduleRepeatable(QUEUE.MAINTENANCE, jobName, repeat);
  }
}

export async function stopWorkers(): Promise<void> {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  workers.length = 0;
  markConsumersRunning(false);
  await closeQueues();
}
