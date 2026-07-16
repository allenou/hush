import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const configSource = readFileSync(resolve(process.cwd(), 'wxt.config.ts'), 'utf8');
const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');

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
});
