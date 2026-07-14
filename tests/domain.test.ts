import { describe, it, expect } from 'vitest';
import { extractDomain, matchesBlockedDomain } from '@/utils/domain';

describe('extractDomain', () => {
  it('extracts domain from standard URL', () => {
    expect(extractDomain('https://www.example.com/path')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(extractDomain('https://www.google.com/search?q=test')).toBe('google.com');
  });

  it('keeps domain without www', () => {
    expect(extractDomain('https://google.com/search')).toBe('google.com');
  });

  it('handles subdomains', () => {
    expect(extractDomain('https://sub.example.com/page')).toBe('sub.example.com');
  });

  it('handles multiple subdomain levels', () => {
    expect(extractDomain('https://a.b.c.example.com')).toBe('a.b.c.example.com');
  });

  it('handles URL with port', () => {
    expect(extractDomain('https://localhost:8080/test')).toBe('localhost');
  });

  it('handles URL with hash', () => {
    expect(extractDomain('https://example.com/page#section')).toBe('example.com');
  });

  it('handles URL with query string', () => {
    expect(extractDomain('https://baidu.com/s?wd=test&pn=20')).toBe('baidu.com');
  });

  it('returns null for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(extractDomain('')).toBe(null);
  });

  it('returns null for malformed URL', () => {
    expect(extractDomain('http://')).toBe(null);
  });

  it('handles http protocol', () => {
    expect(extractDomain('http://example.com/page')).toBe('example.com');
  });

  it('handles IP address', () => {
    expect(extractDomain('http://127.0.0.1:8080')).toBe('127.0.0.1');
  });

  it('handles URLs with trailing slash', () => {
    expect(extractDomain('https://example.com/')).toBe('example.com');
  });

  it('returns null for non-web URLs', () => {
    expect(extractDomain('chrome://extensions')).toBeNull();
  });

  it('matches subdomains only when the setting is enabled', () => {
    expect(matchesBlockedDomain('sub.example.com', ['example.com'], true)).toBe(true);
    expect(matchesBlockedDomain('sub.example.com', ['example.com'], false)).toBe(false);
  });
});
