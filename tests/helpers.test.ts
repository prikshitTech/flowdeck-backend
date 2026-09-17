import { buildMeta, sortDirection, toSkip } from '../src/helpers/pagination.js';
import { cacheKey } from '../src/constants/cacheKeys.js';
import { clientKey } from '../src/helpers/network.js';
import { escapeForPattern, prefixPattern, toTextQuery } from '../src/helpers/search.js';
import { parseRange } from '../src/helpers/range.js';
import { passwordIssues } from '../src/helpers/password.js';
import { slugify, uniqueSlug } from '../src/helpers/slug.js';
import { withId, withIds } from '../src/helpers/present.js';

describe('slug helper', () => {
  it('strips accents and punctuation into a readable slug', () => {
    expect(slugify('  Hello, World! -- Prikshit Team  ')).toBe('hello-world-prikshit-team');
    expect(slugify('Café  Déjà Vu / Notes')).toBe('cafe-deja-vu-notes');
    expect(slugify('Ünïcödé Ström')).toBe('unicode-strom');
  });

  it('returns an empty slug for input with nothing usable and still gives a unique name', () => {
    expect(slugify('!!!')).toBe('');
    expect(uniqueSlug('!!!').startsWith('workspace-')).toBe(true);
    expect(uniqueSlug('My Workspace')).not.toBe(uniqueSlug('My Workspace'));
  });
});

describe('password policy', () => {
  it('lists every rule a weak password breaks', () => {
    expect(passwordIssues('abc')).toEqual(
      expect.arrayContaining(['at least 10 characters', 'one uppercase letter', 'one number', 'one special character'])
    );
  });

  it('accepts a password that satisfies every rule', () => {
    expect(passwordIssues('Str0ng!Passw0rd')).toEqual([]);
  });
});

describe('search helper', () => {
  it('escapes pattern metacharacters so user input cannot become a pattern', () => {
    expect(escapeForPattern('a.*b(c)+$')).toBe('a\\.\\*b\\(c\\)\\+\\$');
    expect(prefixPattern('Eng(ine').source).toBe('^Eng\\(ine');
    expect(prefixPattern('.*').test('anything')).toBe(false);
  });

  it('quotes terms and drops fragments that are too short', () => {
    expect(toTextQuery('  deploy   the  api a ')).toBe('"deploy" "the" "api"');
    expect(toTextQuery('a')).toBe('');
  });
});

describe('network helper', () => {
  it('collapses an ipv6 address onto its routable prefix', () => {
    expect(clientKey('203.0.113.9')).toBe('203.0.113.9');
    expect(clientKey('2001:db8:1234:5678:9abc:def0:1234:5678')).toBe('2001:db8:1234:5678::');
    expect(clientKey('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1234:5678::');
    expect(clientKey('::1')).toBe('::1');
    expect(clientKey(undefined)).toBe('unknown');
  });
});

describe('range helper', () => {
  it('reads a well formed byte range', () => {
    expect(parseRange('bytes=0-99')).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=100-')).toEqual({ start: 100, end: null });
  });

  it('ignores anything malformed', () => {
    expect(parseRange(undefined)).toBeNull();
    expect(parseRange('items=0-9')).toBeNull();
    expect(parseRange('bytes=abc-9')).toBeNull();
    expect(parseRange('bytes=9-2')).toBeNull();
  });
});

describe('pagination helper', () => {
  it('derives skip and page metadata', () => {
    expect(toSkip({ page: 3, limit: 20 })).toBe(40);
    expect(buildMeta({ page: 2, limit: 10 }, 35)).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      pages: 4,
      hasNext: true,
      hasPrevious: true
    });
  });

  it('always reports at least one page and maps the sort keyword', () => {
    expect(buildMeta({ page: 1, limit: 10 }, 0).pages).toBe(1);
    expect(sortDirection('oldest')).toBe(1);
    expect(sortDirection('newest')).toBe(-1);
  });
});

describe('presentation helper', () => {
  it('renames the mongo identifier and drops sensitive fields', () => {
    const output = withId({ _id: 'abc', name: 'Prikshit', password: 'secret', __v: 0 });

    expect(output).toEqual({ id: 'abc', name: 'Prikshit' });
    expect(withIds([{ _id: 'one' }, { _id: 'two' }])).toEqual([{ id: 'one' }, { id: 'two' }]);
  });

  it('passes through values it cannot reshape', () => {
    expect(withId(null)).toBeNull();
    expect(withId('plain')).toBe('plain');
    expect(withId({ name: 'no id' })).toEqual({ name: 'no id' });
  });
});

describe('cache keys', () => {
  it('keeps every workspace scoped cache entry under the tag writes clear', () => {
    const tag = cacheKey.workspaceTag('ws1');

    expect(cacheKey.boardSnapshot('ws1', 'b1').startsWith(tag)).toBe(true);
    expect(cacheKey.pageTree('ws1').startsWith(tag)).toBe(true);
    expect(cacheKey.workspaceSummary('ws1').startsWith(tag)).toBe(true);
    expect(cacheKey.workspaceAnalytics('ws1', 30).startsWith(tag)).toBe(true);
  });
});
