import { describe, expect, it } from 'vitest';
import { isRestrictedContextMenuUrl } from '@/constants/context-menu';

describe('context menu availability', () => {
  it('rejects local web pages', () => {
    expect(isRestrictedContextMenuUrl('http://localhost:3000/page')).toBe(true);
    expect(isRestrictedContextMenuUrl('https://app.localhost/page')).toBe(true);
    expect(isRestrictedContextMenuUrl('http://127.0.0.1:8080/page')).toBe(true);
  });

  it('rejects built-in search engine pages', () => {
    expect(isRestrictedContextMenuUrl('https://www.google.com/search?q=hush')).toBe(true);
    expect(isRestrictedContextMenuUrl('https://bing.com/search?q=hush')).toBe(true);
    expect(isRestrictedContextMenuUrl('https://www.so.com/s?q=hush')).toBe(true);
  });

  it('allows ordinary external web pages', () => {
    expect(isRestrictedContextMenuUrl('https://example.com/article')).toBe(false);
    expect(isRestrictedContextMenuUrl('https://google.com.example.org/')).toBe(false);
  });
});
