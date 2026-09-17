import { z } from 'zod';

import { email, password, shortText } from './common.validator.js';

export const superAdminSchema = {
  body: z.object({
    name: shortText(80),
    email,
    password,
    setupKey: z.string().max(200).optional()
  })
};

export type SuperAdminInput = z.infer<typeof superAdminSchema.body>;
