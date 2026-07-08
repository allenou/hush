import { describe, it, expect } from 'vitest';
import {
  buildPathnamePattern,
  BUILT_IN_ENGINES,
  detectSearchEngine,
  isSearchEngine,
  matchEngineConfig,
} from '../helpers/search-engines';

describe('detectSearchEngine', () => {
  it('detects Google from www URL', () => {
    const result = detectSearchEngine('https://www.google.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Google');
    expect(result!.hostname).toBe('google.com');
  });

  it('detects Google without www', () => {
    const result = detectSearchEngine('https://google.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Google');
  });

  it('detects Baidu', () => {
    const result = detectSearchEngine('https://www.baidu.com/s?wd=你好');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Baidu');
    expect(result!.hostname).toBe('baidu.com');
  });

  it('detects Bing', () => {
    const result = detectSearchEngine('https://www.bing.com/search?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bing');
  });

  it('detects 360搜索 (so.com)', () => {
    const result = detectSearchEngine('https://www.so.com/s?q=test');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('360搜索');
  });

  it('returns null for unknown search engine', () => {
    const result = detectSearchEngine('https://www.example.com');
    expect(result).toBeNull();
  });

  it('returns null for a non-search URL', () => {
    const result = detectSearchEngine('https://github.com/owner/repo');
    expect(result).toBeNull();
  });

  it('handles URL with path and query', () => {
    const result = detectSearchEngine('https://www.baidu.com/link?url=xxx');
    expect(result).not.toBeNull();
    expect(result!.hostname).toBe('baidu.com');
  });

  it('handles subdomain of known engine', () => {
    // sub.duckduckgo.com was removed from BUILT_IN_ENGINES
    // so this should return null
    const result = detectSearchEngine('https://sub.duckduckgo.com/');
    expect(result).toBeNull();
  });

  it('returns null for invalid URL', () => {
    const result = detectSearchEngine('not-a-url');
    expect(result).toBeNull();
  });

  it('is case-insensitive for hostname', () => {
    const result = detectSearchEngine('https://WWW.GOOGLE.COM/search');
    expect(result).not.toBeNull();
    expect(result!.hostname).toBe('google.com');
  });
});

describe('isSearchEngine', () => {
  it('returns true for Google', () => {
    expect(isSearchEngine('https://www.google.com/')).toBe(true);
  });

  it('returns true for Baidu', () => {
    expect(isSearchEngine('https://www.baidu.com/')).toBe(true);
  });

  it('returns false for unknown site', () => {
    expect(isSearchEngine('https://www.example.com/')).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(isSearchEngine('invalid')).toBe(false);
  });

  it('handles www prefix correctly', () => {
    expect(isSearchEngine('https://google.com/')).toBe(true);
  });
});

describe('BUILT_IN_ENGINES', () => {
  it('contains expected engines', () => {
    const hostnames = BUILT_IN_ENGINES.map((e) => e.hostname);
    expect(hostnames).toContain('google.com');
    expect(hostnames).toContain('baidu.com');
    expect(hostnames).toContain('bing.com');
    expect(hostnames).toContain('so.com');
  });

  it('no longer contains DuckDuckGo', () => {
    const hostnames = BUILT_IN_ENGINES.map((e) => e.hostname);
    expect(hostnames).not.toContain('duckduckgo.com');
  });

  it('has no duplicate hostnames', () => {
    const hostnames = BUILT_IN_ENGINES.map((e) => e.hostname);
    expect(new Set(hostnames).size).toBe(hostnames.length);
  });

  it('has no duplicate names', () => {
    const names = BUILT_IN_ENGINES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all engines have required fields', () => {
    for (const engine of BUILT_IN_ENGINES) {
      expect(engine.name).toBeTruthy();
      expect(engine.hostname).toBeTruthy();
      expect(engine.linkSelector).toBe('a[href]');
    }
  });
});

describe('buildPathnamePattern', () => {
  it('normalizes numeric and long token segments', () => {
    expect(buildPathnamePattern('/search/123456/abcdefabcdefabcdef')).toBe('/search/:num/:id');
  });
});

describe('matchEngineConfig', () => {
  it('matches hostname-only config', () => {
    expect(matchEngineConfig({
      name: 'Any',
      hostname: 'example.com',
      containerSelector: '#r',
      itemSelector: '.i',
      linkSelector: 'a[href]',
    }, {
      hostname: 'www.example.com',
      pathname: '/anything',
    })).toBe(true);
  });

  it('matches pathname-specific config after normalization', () => {
    expect(matchEngineConfig({
      name: 'Search',
      hostname: 'example.com',
      pathnamePattern: '/search/:num',
      containerSelector: '#r',
      itemSelector: '.i',
      linkSelector: 'a[href]',
    }, {
      hostname: 'example.com',
      pathname: '/search/42',
    })).toBe(true);
  });
});
