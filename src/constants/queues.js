export const QUEUE = {
  AUDIT: 'audit',
  NOTIFICATION: 'notification',
  MAINTENANCE: 'maintenance'
};

export const JOB = {
  AUDIT_ENTRY: 'audit.entry',
  MENTION_FAN_OUT: 'notification.mention',
  CARD_ASSIGNED: 'notification.card_assigned',
  DUE_SOON_SWEEP: 'maintenance.due_soon',
  PURGE_ARCHIVED: 'maintenance.purge_archived'
};

export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86400 }
};

export const REPEATABLE = {
  [JOB.DUE_SOON_SWEEP]: { pattern: '0 * * * *' },
  [JOB.PURGE_ARCHIVED]: { pattern: '30 3 * * *' }
};
