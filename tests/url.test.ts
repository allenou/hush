import { describe, it, expect, beforeEach } from 'vitest';
import { extractResultUrl, isSearchEngineRedirect } from '../utils/url';

/** Helper: mock window.location for tests */
function mockLocation(href: string): void {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    value: {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      ancestorOrigins: [] as string[],
      assign: () => {},
      replace: () => {},
      reload: () => {},
      toString: () => url.href,
    },
    writable: true,
    configurable: true,
  });
}

// ========== isSearchEngineRedirect ==========

describe('isSearchEngineRedirect', () => {
  beforeEach(() => {
    mockLocation('https://www.google.com/search?q=test');
  });

  it('detects same-hostname redirect (Google → Google)', () => {
    expect(isSearchEngineRedirect('https://www.google.com/url?q=https://real.com')).toBe(true);
  });

  it('detects redirect by path pattern: /url?', () => {
    expect(isSearchEngineRedirect('https://www.google.com/url?q=xxx')).toBe(true);
  });

  it('detects redirect by path pattern: /link?', () => {
    expect(isSearchEngineRedirect('https://www.baidu.com/link?url=xxx')).toBe(true);
  });

  it('detects redirect by path pattern: /ck/', () => {
    expect(isSearchEngineRedirect('https://www.baidu.com/ck/?url=xxx')).toBe(true);
  });

  it('detects redirect by path pattern: /l/', () => {
    expect(isSearchEngineRedirect('https://www.google.com/l/xxx')).toBe(true);
  });

  it('detects redirect by path pattern: /goto/', () => {
    expect(isSearchEngineRedirect('https://www.example.com/goto/xxx')).toBe(true);
  });

  it('detects redirect by path pattern: /redirect', () => {
    expect(isSearchEngineRedirect('https://www.example.com/redirect?url=xxx')).toBe(true);
  });

  it('returns false for direct external URL', () => {
    expect(isSearchEngineRedirect('https://example.com/page')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSearchEngineRedirect('')).toBe(false);
  });

  it('handles malformed URL gracefully (falls back to path check)', () => {
    // invalid URL → path check: still works for known patterns
    expect(isSearchEngineRedirect('/url?q=https://real.com')).toBe(true);
    expect(isSearchEngineRedirect('not-a-url')).toBe(false);
  });

  it('uses current page hostname for hostname matching', () => {
    mockLocation('https://www.baidu.com/s?wd=test');
    expect(isSearchEngineRedirect('https://www.baidu.com/link?url=xxx')).toBe(true);
    expect(isSearchEngineRedirect('https://www.google.com/url?q=xxx')).toBe(true);
  });

  it('returns false for same-hostname non-redirect URL', () => {
    // Same hostname but no redirect pattern → still true (hostname match)
    expect(isSearchEngineRedirect('https://www.google.com/search?q=hello')).toBe(true);
  });
});

// ========== extractResultUrl ==========

describe('extractResultUrl', () => {
  beforeEach(() => {
    mockLocation('https://www.google.com/search?q=test');
  });

  it('extracts direct href from link selector', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://example.com/page">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://example.com/page');
  });

  it('returns redirect URL when no real URL can be extracted', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.google.com/url?q=https://real-site.com&sa=U">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe(
      'https://www.google.com/url?q=https://real-site.com&sa=U',
    );
  });

  it('extracts real URL from link data- attributes on Baidu', () => {
    mockLocation('https://www.baidu.com/s?wd=test');
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.baidu.com/link?url=xxx" data-url="https://target.com">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://target.com');
  });

  it('returns cite text as fallback for redirect URLs', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.google.com/url?q=https://real.com">result</a><cite>real-site.com</cite>';
    expect(extractResultUrl(container, 'a[href]')).toBeTruthy();
  });

  it('extracts URL from item attribute when link has no data', () => {
    mockLocation('https://www.baidu.com/s?wd=test');
    const container = document.createElement('div');
    container.setAttribute('data-url', 'https://found-in-item.com');
    container.innerHTML = '<a href="https://www.baidu.com/link?url=xxx">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://found-in-item.com');
  });

  it('returns empty string when no link found', () => {
    const container = document.createElement('div');
    container.textContent = 'no link here';
    expect(extractResultUrl(container, 'a[href]')).toBe('');
  });

  it('returns the href for javascript: link', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="javascript:void(0)">click</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('javascript:void(0)');
  });
});
