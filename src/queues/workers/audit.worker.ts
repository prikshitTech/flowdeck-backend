import type { Job } from 'bullmq';

import { persist, type AuditEntry } from '../../services/audit.service.js';

export default async function handleAuditJob(job: Job<AuditEntry>) {
  await persist(job.data);
  return { stored: true };
}
