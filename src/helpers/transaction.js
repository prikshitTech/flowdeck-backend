import mongoose from 'mongoose';

import logger from '../config/logger.js';

let replicaSetDeployment = null;

async function detectDeployment() {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(info.setName) || info.msg === 'isdbgrid';
  } catch (error) {
    logger.warn({ err: error }, 'unable to detect deployment type, running without transactions');
    return false;
  }
}

export function forgetDeployment() {
  replicaSetDeployment = null;
}

export async function supportsTransactions() {
  if (replicaSetDeployment === null) {
    replicaSetDeployment = await detectDeployment();
  }

  return replicaSetDeployment;
}

export async function withTransaction(work) {
  if (!(await supportsTransactions())) {
    return work(null);
  }

  const session = await mongoose.startSession();

  try {
    let outcome;
    await session.withTransaction(async () => {
      outcome = await work(session);
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}
