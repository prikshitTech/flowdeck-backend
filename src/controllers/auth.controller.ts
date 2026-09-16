import asyncHandler from '../helpers/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { AUTH_MESSAGES, COMMON_MESSAGES } from '../constants/messages.js';
import { describeRequest } from '../helpers/requestContext.js';

export const register = asyncHandler(async (req, res) => {
  const { user, session } = await authService.register(req.body, describeRequest(req));

  res.created({ user, ...session }, AUTH_MESSAGES.REGISTERED);
});

export const login = asyncHandler(async (req, res) => {
  const { user, session } = await authService.login(req.body, describeRequest(req));

  res.ok({ user, ...session }, AUTH_MESSAGES.LOGGED_IN);
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, session } = await authService.refreshSession(req.body.refreshToken, describeRequest(req));

  res.ok({ user, ...session }, AUTH_MESSAGES.TOKEN_REFRESHED);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);

  res.ok(null, AUTH_MESSAGES.LOGGED_OUT);
});

export const logoutEverywhere = asyncHandler(async (req, res) => {
  const result = await authService.logoutEverywhere(req.auth.userId);

  res.ok(result, AUTH_MESSAGES.SESSIONS_REVOKED);
});

export const profile = asyncHandler(async (req, res) => {
  res.ok(req.user, COMMON_MESSAGES.FETCHED);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.auth.userId, req.body);

  res.ok(user, AUTH_MESSAGES.PROFILE_UPDATED);
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.auth.userId, req.body);

  res.ok(null, AUTH_MESSAGES.PASSWORD_CHANGED);
});

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.listSessions(req.auth.userId);

  res.ok(sessions, COMMON_MESSAGES.FETCHED);
});

export const revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSession(req.auth.userId, req.params.sessionId);

  res.ok(null, COMMON_MESSAGES.DELETED);
});
