import { Worker } from 'bullmq';

import handleAuditJob from './workers/audit.worker.js';
import handleMaintenanceJob from './workers/maintenance.worker.js';
import handleNotificationJob from './workers/notification.worker.js';
import logger from '../config/logger.js';
import { JOB, QUEUE, REPEATABLE } from '../constants/queues.js';
import { closeQueues, enqueue, queueConnection, scheduleRepeatable } from './index.js';
import { persist, useAuditSink } from '../services/audit.service.js';

const WORKER_CONCURRENCY = 5;

const definitions = [
  { name: QUEUE.AUDIT, processor: handleAuditJob },
  { name: QUEUE.NOTIFICATION, processor: handleNotificationJob },
  { name: QUEUE.MAINTENANCE, processor: handleMaintenanceJob }
];

const workers = [];

export function routeAuditsThroughQueue() {
  useAuditSink((entry) => enqueue(QUEUE.AUDIT, JOB.AUDIT_ENTRY, entry, { runInline: persist }));
}

export function startWorkers() {
  for (const { name, processor } of definitions) {
    const worker = new Worker(name, processor, {
      connection: queueConnection(),
      concurrency: WORKER_CONCURRENCY
    });

    worker.on('failed', (job, error) => logger.error({ err: error, queue: name, job: job?.name }, 'job failed'));
    worker.on('error', (error) => logger.warn({ err: error, queue: name }, 'worker connection problem'));

    workers.push(worker);
  }

  logger.info(`${workers.length} queue workers started`);
  return workers;
}

export async function scheduleRecurringJobs() {
  for (const [jobName, repeat] of Object.entries(REPEATABLE)) {
    await scheduleRepeatable(QUEUE.MAINTENANCE, jobName, repeat);
  }
}

export async function stopWorkers() {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  workers.length = 0;
  await closeQueues();
}
