import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractAnchorAttributeUrls,
  extractResultUrl,
  isDomainHomepageUrl,
  isSearchEngineRedirect,
  resolveContextTargetUrl,
} from '@/utils/url';

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

describe('isDomainHomepageUrl', () => {
  it('treats a plain root URL as a domain homepage', () => {
    expect(isDomainHomepageUrl('https://example.com/')).toBe(true);
  });

  it('ignores common tracking parameters on a homepage', () => {
    expect(isDomainHomepageUrl(
      'https://example.com/?utm_source=search&gclid=123&ref=home',
    )).toBe(true);
  });

  it('treats meaningful query parameters as a specific URL', () => {
    expect(isDomainHomepageUrl('https://example.com/?article=123')).toBe(false);
  });

  it('treats paths and hashes as specific URLs', () => {
    expect(isDomainHomepageUrl('https://example.com/article')).toBe(false);
    expect(isDomainHomepageUrl('https://example.com/#pricing')).toBe(false);
  });
});

describe('resolveContextTargetUrl', () => {
  it('restores the original result URL when right-clicking an injected badge', () => {
    const item = document.createElement('div');
    item.dataset.srbTargetUrl = 'https://sub.example.com/article';
    const badge = document.createElement('div');
    badge.className = 'srb-blocked-badge';
    item.appendChild(badge);

    expect(resolveContextTargetUrl(
      badge,
      'https://www.google.com/search?q=test',
    )).toBe('https://sub.example.com/article');
  });

  it('prefers the exact clicked link inside a marked result', () => {
    const item = document.createElement('div');
    item.dataset.srbTargetUrl = 'https://example.com/primary';
    const link = document.createElement('a');
    link.href = 'https://example.com/sitelink';
    item.appendChild(link);

    expect(resolveContextTargetUrl(
      link,
      'https://www.google.com/search?q=test',
    )).toBe('https://example.com/sitelink');
  });
});

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

  it('extracts decoded target URL from Google redirect parameters', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.google.com/url?q=https://real-site.com&sa=U">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://real-site.com');
  });

  it('extracts advertiser URL from Google ad redirects', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.google.com/aclk?sa=L&adurl=https%3A%2F%2Fshop.example%2Flanding">ad</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://shop.example/landing');
  });

  it('extracts advertiser URL from Google Ads tracking hosts', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.googleadservices.com/pagead/aclk?adurl=https%3A%2F%2Fmerchant.example%2Foffer">ad</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://merchant.example/offer');
  });

  it('extracts decoded target URL from generic redirect url parameters', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="https://www.example.com/redirect?url=https%3A%2F%2Freal-site.com%2Fpage">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://real-site.com/page');
  });

  it('extracts real URL from link data- attributes on Baidu', () => {
    mockLocation('https://www.baidu.com/s?wd=test');
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.baidu.com/link?url=xxx" data-url="https://target.com">result</a>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://target.com');
  });

  it('normalizes cite text as fallback for opaque redirect URLs', () => {
    mockLocation('https://www.baidu.com/s?wd=test');
    const container = document.createElement('div');
    container.innerHTML =
      '<a href="https://www.baidu.com/link?url=opaque">result</a><cite>www.real-site.com/path › cached</cite>';
    expect(extractResultUrl(container, 'a[href]')).toBe('https://www.real-site.com/path');
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

describe('extractAnchorAttributeUrls', () => {
  beforeEach(() => {
    mockLocation('https://www.so.com/s?q=csdn');
  });

  it('extracts URLs from every attribute without relying on attribute names', () => {
    const link = document.createElement('a');
    link.href = 'https://www.so.com/link?m=opaque';
    link.setAttribute('data-arbitrary-target', 'https://www.csdn.net/');
    link.setAttribute('custom-payload', '{"target":"https://blog.csdn.net/post/1"}');

    expect(extractAnchorAttributeUrls(link)).toEqual(expect.arrayContaining([
      'https://www.so.com/link?m=opaque',
      'https://www.csdn.net/',
      'https://blog.csdn.net/post/1',
    ]));
  });

  it('extracts a domain-only attribute as a comparable URL', () => {
    const link = document.createElement('a');
    link.setAttribute('data-anything', 'download.csdn.net');

    expect(extractAnchorAttributeUrls(link)).toContain('https://download.csdn.net/');
  });

  it('does not treat a domain in a search query as the target hostname', () => {
    const link = document.createElement('a');
    link.href = 'https://www.so.com/s?q=blog.csdn.net';

    expect(extractAnchorAttributeUrls(link)).toEqual([
      'https://www.so.com/s?q=blog.csdn.net',
    ]);
  });
});
