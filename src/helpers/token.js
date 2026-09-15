import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import env from '../config/env.js';

const ISSUER = 'flowdeck';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
    expiresIn: env.ACCESS_TOKEN_TTL
  });
}

export function signRefreshToken(user, family) {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ sub: String(user._id), family, jti }, env.JWT_REFRESH_SECRET, {
    issuer: ISSUER,
    expiresIn: env.REFRESH_TOKEN_TTL
  });

  return { token, family, expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000) };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER });
}

export function newTokenFamily() {
  return crypto.randomUUID();
}
