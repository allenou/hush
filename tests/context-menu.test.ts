import { describe, expect, it } from 'vitest';
import { WEB_PAGE_MATCH_PATTERNS } from '@/constants/context-menu';

describe('context menu page scope', () => {
  it('uses native HTTP and HTTPS menu patterns without injecting page scripts', () => {
    expect(WEB_PAGE_MATCH_PATTERNS).toEqual(['http://*/*', 'https://*/*']);
  });
});
