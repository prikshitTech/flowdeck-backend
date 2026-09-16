const PATTERN_SPECIALS = new Set(['\\', '^', '$', '.', '|', '?', '*', '+', '(', ')', '[', ']', '{', '}']);
const MIN_TERM_LENGTH = 2;
const MAX_TERMS = 8;

export function escapeForPattern(value: string): string {
  return [...value]
    .map((character) => (PATTERN_SPECIALS.has(character) ? `\\${character}` : character))
    .join('');
}

export function prefixPattern(value: string): RegExp {
  return new RegExp(`^${escapeForPattern(value.trim())}`, 'i');
}

export function toTextQuery(value: string): string {
  const terms = value
    .trim()
    .split(' ')
    .map((term) => term.trim().split('"').join(''))
    .filter((term) => term.length >= MIN_TERM_LENGTH)
    .slice(0, MAX_TERMS);

  return terms.map((term) => `"${term}"`).join(' ');
}
