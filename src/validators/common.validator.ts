import mongoose from 'mongoose';
import { z } from 'zod';

import { passwordIssues } from '../helpers/password.js';

export const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), {
  message: 'Must be a valid identifier'
});

export const email = z.string().trim().toLowerCase().email('Must be a valid email address');

export const password = z.string().superRefine((value, ctx) => {
  for (const issue of passwordIssues(value)) {
    ctx.addIssue({ code: 'custom', message: `Password must contain ${issue}` });
  }
});

export const shortText = (max = 120) => z.string().trim().min(1).max(max);

export const idParam = (key = 'id') => z.object({ [key]: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest']).default('newest')
});
