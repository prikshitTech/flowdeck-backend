export function describeRequest(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? null
  };
}

export function bearerToken(req) {
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
