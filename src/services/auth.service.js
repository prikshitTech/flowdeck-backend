import env from '../config/env.js';
import ApiError from '../helpers/apiError.js';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import {
  hashToken,
  newTokenFamily,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../helpers/token.js';

async function issueSession(user, context, family = newTokenFamily()) {
  const refresh = signRefreshToken(user, family);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refresh.token),
    family,
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
    expiresAt: refresh.expiresAt
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh.token,
    tokenType: 'Bearer',
    expiresIn: env.ACCESS_TOKEN_TTL
  };
}

async function revokeFamily(family) {
  await RefreshToken.updateMany({ family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function register(payload, context) {
  const taken = await User.exists({ email: payload.email });

  if (taken) {
    throw ApiError.conflict(AUTH_MESSAGES.EMAIL_TAKEN);
  }

  const user = await User.create(payload);
  const session = await issueSession(user, context);

  return { user, session };
}

export async function login({ email, password }, context) {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  if (!user.isActive()) {
    throw ApiError.forbidden(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = await issueSession(user, context);

  return { user, session };
}

export async function refreshSession(token, context) {
  let claims;

  try {
    claims = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized(AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });

  if (!stored || !stored.isUsable()) {
    await revokeFamily(claims.family);
    throw ApiError.unauthorized(AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
  }

  const user = await User.findById(claims.sub);

  if (!user || !user.isActive()) {
    await revokeFamily(claims.family);
    throw ApiError.forbidden(AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  stored.revokedAt = new Date();
  await stored.save();

  return { user, session: await issueSession(user, context, claims.family) };
}

export async function logout(token) {
  if (!token) {
    throw ApiError.badRequest(AUTH_MESSAGES.REFRESH_TOKEN_REQUIRED);
  }

  await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { $set: { revokedAt: new Date() } });
}

export async function logoutEverywhere(userId) {
  const result = await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { revoked: result.modifiedCount };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');

  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw ApiError.badRequest(AUTH_MESSAGES.CURRENT_PASSWORD_WRONG);
  }

  user.password = newPassword;
  await user.save();
  await logoutEverywhere(userId);

  return user;
}

export async function listSessions(userId) {
  return RefreshToken.find({ user: userId, revokedAt: null })
    .sort({ createdAt: -1 })
    .select('ip userAgent createdAt expiresAt');
}

export async function revokeSession(userId, sessionId) {
  const session = await RefreshToken.findOneAndUpdate(
    { _id: sessionId, user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );

  if (!session) {
    throw ApiError.notFound(AUTH_MESSAGES.SESSION_NOT_FOUND);
  }

  return session;
}
