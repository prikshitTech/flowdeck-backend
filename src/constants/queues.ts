export const QUEUE = {
  AUDIT: 'audit',
  NOTIFICATION: 'notification',
  MAINTENANCE: 'maintenance'
} as const;

export const JOB = {
  AUDIT_ENTRY: 'audit.entry',
  DELIVER_NOTIFICATION: 'notification.deliver',
  DUE_SOON_SWEEP: 'maintenance.due_soon',
  PURGE_ARCHIVED: 'maintenance.purge_archived'
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];
export type JobName = (typeof JOB)[keyof typeof JOB];

export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86400 }
} as const;

export const REPEATABLE = {
  [JOB.DUE_SOON_SWEEP]: { pattern: '0 * * * *' },
  [JOB.PURGE_ARCHIVED]: { pattern: '30 3 * * *' }
} as const;
