const PREFIX = 'bytes=';

export function parseRange(header) {
  if (!header || !header.startsWith(PREFIX)) {
    return null;
  }

  const [startRaw, endRaw] = header.slice(PREFIX.length).split('-');
  const start = Number(startRaw);

  if (!Number.isInteger(start) || start < 0) {
    return null;
  }

  if (!endRaw) {
    return { start, end: null };
  }

  const end = Number(endRaw);

  return Number.isInteger(end) && end >= start ? { start, end } : null;
}
