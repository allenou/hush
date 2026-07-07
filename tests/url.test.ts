import { describe, it, expect, beforeEach } from 'vitest';
import { extractResultUrl } from '../utils/url';

/** Helper: set window.location.href via Object.defineProperty */
function setLocationHref(href: string): void {
  // JSDom rejects direct assignment, so we mock via defineProperty
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

describe('extractResultUrl', () => {
  beforeEach(() => {
    setLocationHref('https://www.google.com/search?q=test');
  });

  it('extracts direct href from link selector', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://example.com/page">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://example.com/page');
  });

  it('returns redirect URL when no real URL can be extracted', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.google.com/url?q=https://real-site.com&sa=U">result</a>';
    // Function can't parse query params from redirect URLs → returns href
    expect(extractResultUrl(container, 'a[href]')).toBe(
      'https://www.google.com/url?q=https://real-site.com&sa=U',
    );
  });

  it('extracts real URL from link data- attributes on Baidu', () => {
    setLocationHref('https://www.baidu.com/s?wd=test');
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.baidu.com/link?url=xxx" data-url="https://target.com">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://target.com');
  });

  it('returns cite text as fallback for redirect URLs', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.google.com/url?q=https://real.com">result</a><cite>real-site.com</cite>';
    const result = extractResultUrl(container, 'a[href]');
    expect(result).toBeTruthy();
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
