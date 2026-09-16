import mongoose, { type ClientSession } from 'mongoose';

import logger from '../config/logger.js';

export type Session = ClientSession | null;

let replicaSetDeployment: boolean | null = null;

async function detectDeployment(): Promise<boolean> {
  try {
    const info = await mongoose.connection.db!.admin().command({ hello: 1 });
    return Boolean(info.setName) || info.msg === 'isdbgrid';
  } catch (error) {
    logger.warn({ err: error }, 'unable to detect deployment type, running without transactions');
    return false;
  }
}

export function forgetDeployment(): void {
  replicaSetDeployment = null;
}

export async function supportsTransactions(): Promise<boolean> {
  if (replicaSetDeployment === null) {
    replicaSetDeployment = await detectDeployment();
  }

  return replicaSetDeployment;
}

export async function withTransaction<T>(work: (session: Session) => Promise<T>): Promise<T> {
  if (!(await supportsTransactions())) {
    return work(null);
  }

  const session = await mongoose.startSession();

  try {
    let outcome!: T;
    await session.withTransaction(async () => {
      outcome = await work(session);
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}
