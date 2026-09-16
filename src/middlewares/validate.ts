import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

const TARGETS = ['params', 'query', 'body'] as const;

type Target = (typeof TARGETS)[number];

export type RequestSchemas = Partial<Record<Target, ZodType>>;

export default function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    for (const target of TARGETS) {
      const schema = schemas[target];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[target] ?? {});

      if (!result.success) {
        return next(result.error);
      }

      (req as unknown as Record<Target, unknown>)[target] = result.data as Request[Target];
    }

    return next();
  };
}
