const PREFIX = 'bytes=';

export interface ByteRange {
  start: number;
  end: number | null;
}

export function parseRange(header: string | undefined): ByteRange | null {
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
