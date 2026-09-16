import { z } from 'zod';

import { email, objectId, password, shortText } from './common.validator.js';

export const registerSchema = {
  body: z.object({
    name: shortText(80),
    email,
    password
  })
};

export const loginSchema = {
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required')
  })
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(20, 'A refresh token is required')
  })
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password
  })
};

export const updateProfileSchema = {
  body: z
    .object({
      name: shortText(80).optional(),
      avatarUrl: z.string().url().optional()
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
};

export const sessionParamsSchema = {
  params: z.object({ sessionId: objectId })
};

export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema.body>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema.body>;
