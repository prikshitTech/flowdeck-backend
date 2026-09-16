import crypto from 'node:crypto';

import jwt, { type JwtPayload } from 'jsonwebtoken';

import env from '../config/env.js';

const ISSUER = 'flowdeck';

export interface TokenSubject {
  _id: unknown;
  role: string;
  tokenVersion?: number;
}

export interface AccessClaims extends JwtPayload {
  sub: string;
  role: string;
  ver?: number;
}

export interface RefreshClaims extends JwtPayload {
  sub: string;
  family: string;
  jti: string;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user: TokenSubject): string {
  return jwt.sign(
    { sub: String(user._id), role: user.role, ver: user.tokenVersion ?? 0 },
    env.JWT_ACCESS_SECRET,
    { issuer: ISSUER, expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

export function signRefreshToken(user: TokenSubject, family: string) {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ sub: String(user._id), family, jti }, env.JWT_REFRESH_SECRET, {
    issuer: ISSUER,
    expiresIn: env.REFRESH_TOKEN_TTL
  });

  return { token, family, expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000) };
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER }) as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER }) as RefreshClaims;
}

export function newTokenFamily(): string {
  return crypto.randomUUID();
}
