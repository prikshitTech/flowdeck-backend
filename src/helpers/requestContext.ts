import type { Request } from 'express';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export function describeRequest(req: Request): RequestContext {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null
  };
}

export function bearerToken(req: Request): string | null {
  const header = req.get('authorization');

  if (!header) {
    return null;
  }

  const [scheme, ...rest] = header.split(' ');
  const value = rest.join(' ').trim();

  if (scheme.toLowerCase() !== 'bearer' || value.length === 0) {
    return null;
  }

  return value;
}
