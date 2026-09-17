import ApiError from '../helpers/apiError.js';
import User from '../models/user.model.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { ADMIN_MESSAGES } from '../constants/messages.js';
import { SYSTEM_ROLE } from '../constants/roles.js';
import type { RequestContext } from '../helpers/requestContext.js';
import type { SuperAdminInput } from '../validators/admin.validator.js';

const DUPLICATE_KEY = 11000;

export async function setupStatus() {
  const existing = await User.exists({ role: SYSTEM_ROLE.SUPER_ADMIN });

  return { available: !existing, requiresKey: env.SUPER_ADMIN_SETUP_KEY.length > 0 };
}

export async function createSuperAdmin(payload: SuperAdminInput, context: RequestContext) {
  const { available, requiresKey } = await setupStatus();

  if (!available) {
    throw ApiError.conflict(ADMIN_MESSAGES.ALREADY_CLAIMED);
  }

  if (requiresKey && payload.setupKey !== env.SUPER_ADMIN_SETUP_KEY) {
    throw ApiError.forbidden(ADMIN_MESSAGES.SETUP_KEY_WRONG);
  }

  const taken = await User.exists({ email: payload.email });

  if (taken) {
    throw ApiError.conflict(ADMIN_MESSAGES.EMAIL_TAKEN);
  }

  try {
    const admin = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: SYSTEM_ROLE.SUPER_ADMIN
    });

    logger.warn({ email: admin.email, ip: context.ip }, 'super admin account created');

    return admin;
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY) {
      throw ApiError.conflict(ADMIN_MESSAGES.ALREADY_CLAIMED);
    }

    throw error;
  }
}
