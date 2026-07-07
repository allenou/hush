import { describe, it, expect } from 'vitest';
import { detectSearchEngine, isSearchEngine, BUILT_IN_ENGINES } from '../utils/search-engines';

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

  it('all engines have required fields', () => {
    for (const engine of BUILT_IN_ENGINES) {
      expect(engine.name).toBeTruthy();
      expect(engine.hostname).toBeTruthy();
      expect(engine.linkSelector).toBe('a[href]');
    }
  });
});
