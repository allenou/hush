import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const configSource = readFileSync(resolve(process.cwd(), 'wxt.config.ts'), 'utf8');
const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');
const contextMenuGuardSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/context-menu-guard.content.ts'),
  'utf8',
);

describe('Manifest permissions', () => {
  it('uses the shared exact search engine match patterns', () => {
    expect(configSource).toContain('SEARCH_ENGINE_MATCH_PATTERNS');
    expect(contentSource).toContain('SEARCH_ENGINE_MATCH_PATTERNS');
    expect(configSource).not.toContain("'<all_urls>'");
    expect(contentSource).not.toContain("'<all_urls>'");
  });

  it('requests only storage and context menu permissions', () => {
    expect(configSource).toContain("permissions: ['storage', 'contextMenus']");
    expect(configSource).not.toContain("'activeTab'");
  });

  it('guards search engines and local web pages without requesting all URLs', () => {
    expect(contextMenuGuardSource).toContain('SEARCH_ENGINE_MATCH_PATTERNS');
    expect(contextMenuGuardSource).toContain('LOCAL_PAGE_MATCH_PATTERNS');
    expect(contextMenuGuardSource).toContain('hideContextMenu();');
    expect(contextMenuGuardSource).not.toContain("'<all_urls>'");
  });

  it('provides the standard toolbar and extension-management icon sizes', () => {
    expect(configSource).toContain("'16': '/icons/icon-16.png'");
    expect(configSource).toContain("'32': '/icons/icon-32.png'");
    expect(configSource).toContain("'48': '/icons/icon-48.png'");
    expect(configSource).toContain("'128': '/icons/icon-128.png'");
  });
});
