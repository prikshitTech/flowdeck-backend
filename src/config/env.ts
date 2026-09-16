import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),
  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(240),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(6),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().positive().default(300),
  IP_BLOCK_THRESHOLD: z.coerce.number().int().positive().default(25),
  IP_BLOCK_SECONDS: z.coerce.number().int().positive().default(1800),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(2048).default(50),
  RUN_WORKERS_IN_API: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true')
});

export type Env = z.infer<typeof schema>;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration\n${details.join('\n')}`);
}

const env: Env = parsed.data;

export const corsOrigins: string | string[] =
  env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export default env;
