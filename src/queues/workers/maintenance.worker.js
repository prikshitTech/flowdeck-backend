import Card from '../../models/card.model.js';
import Page from '../../models/page.model.js';
import { JOB } from '../../constants/queues.js';
import { remindDueCards } from '../../services/notification.service.js';

const PURGE_AFTER_DAYS = 60;

async function purgeArchived() {
  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const [pages, cards] = await Promise.all([
    Page.deleteMany({ archivedAt: { $lt: cutoff } }),
    Card.deleteMany({ archivedAt: { $lt: cutoff } })
  ]);

  return { pages: pages.deletedCount, cards: cards.deletedCount };
}

const handlers = {
  [JOB.DUE_SOON_SWEEP]: remindDueCards,
  [JOB.PURGE_ARCHIVED]: purgeArchived
};

export default async function handleMaintenanceJob(job) {
  const handler = handlers[job.name];

  return handler ? handler() : { skipped: job.name };
}
