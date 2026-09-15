import env from '../config/env.js';
import ApiError from '../helpers/apiError.js';
import logger from '../config/logger.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { cacheKey } from '../constants/cacheKeys.js';
import { bump, countOf, drop, hasFlag, markFlag, secondsLeft } from './cache.service.js';
import { clientKey } from '../helpers/network.js';

export async function assertIpAllowed(address) {
  const ip = clientKey(address);

  if (await hasFlag(cacheKey.blockedIp(ip))) {
    const retryAfter = await secondsLeft(cacheKey.blockedIp(ip));
    throw ApiError.forbidden(`This address is temporarily blocked, try again in ${retryAfter} seconds`);
  }
}

export async function assertLoginAllowed(email, address) {
  const ip = clientKey(address);

  const [byEmail, byIp] = await Promise.all([
    countOf(cacheKey.loginFailuresByEmail(email)),
    countOf(cacheKey.loginFailuresByIp(ip))
  ]);

  if (byEmail < env.LOGIN_MAX_ATTEMPTS && byIp < env.IP_BLOCK_THRESHOLD) {
    return;
  }

  const key = byEmail >= env.LOGIN_MAX_ATTEMPTS ? cacheKey.loginFailuresByEmail(email) : cacheKey.loginFailuresByIp(ip);
  const retryAfter = await secondsLeft(key);

  throw ApiError.tooManyRequests(`Too many failed attempts, try again in ${retryAfter} seconds`, { retryAfter });
}

export async function recordLoginFailure(email, address) {
  const ip = clientKey(address);

  const [byEmail, byIp] = await Promise.all([
    bump(cacheKey.loginFailuresByEmail(email), env.LOGIN_LOCK_SECONDS),
    bump(cacheKey.loginFailuresByIp(ip), env.LOGIN_LOCK_SECONDS)
  ]);

  if (byIp >= env.IP_BLOCK_THRESHOLD) {
    await markFlag(cacheKey.blockedIp(ip), env.IP_BLOCK_SECONDS);
    logger.warn({ ip, attempts: byIp }, 'address blocked after repeated failed logins');
  }

  return { byEmail, byIp, remaining: Math.max(env.LOGIN_MAX_ATTEMPTS - byEmail, 0) };
}

export async function clearLoginFailures(email, address) {
  const ip = clientKey(address);

  await drop(cacheKey.loginFailuresByEmail(email), cacheKey.loginFailuresByIp(ip));
}

export async function blockAddress(address, seconds = env.IP_BLOCK_SECONDS) {
  const ip = clientKey(address);

  await markFlag(cacheKey.blockedIp(ip), seconds);
  return { ip, blockedForSeconds: seconds };
}

export async function unblockAddress(address) {
  const ip = clientKey(address);

  await drop(cacheKey.blockedIp(ip), cacheKey.loginFailuresByIp(ip));
  return { ip, blocked: false };
}

export const bruteForceMessage = AUTH_MESSAGES.INVALID_CREDENTIALS;
