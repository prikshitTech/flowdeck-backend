import crypto from 'node:crypto';

const ALLOWED = new Set('abcdefghijklmnopqrstuvwxyz0123456789');
const SEPARATOR = '-';
const MAX_LENGTH = 60;
const COMBINING_START = 0x0300;
const COMBINING_END = 0x036f;

function isCombiningMark(character) {
  const code = character.codePointAt(0);
  return code >= COMBINING_START && code <= COMBINING_END;
}

export function slugify(value) {
  const characters = [...value.normalize('NFKD').toLowerCase()];
  const output = [];

  for (const character of characters) {
    if (isCombiningMark(character)) {
      continue;
    }

    if (ALLOWED.has(character)) {
      output.push(character);
      continue;
    }

    if (output.length > 0 && output.at(-1) !== SEPARATOR) {
      output.push(SEPARATOR);
    }
  }

  while (output.at(-1) === SEPARATOR) {
    output.pop();
  }

  return output.join('').slice(0, MAX_LENGTH);
}

export function uniqueSlug(value) {
  const base = slugify(value) || 'workspace';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}
