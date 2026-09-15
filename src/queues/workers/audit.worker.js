import { persist } from '../../services/audit.service.js';

export default async function handleAuditJob(job) {
  await persist(job.data);
  return { stored: true };
}
