import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clearAllMarkers } from '@/helpers/ad-blocker';

describe('marking lifecycle', () => {
  it('checks for page-world SPA URL changes during result mutations', () => {
    const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');
    expect(contentSource).toContain('handleUrlChange(window.location.href)');
  });

  it('restores injected styles before dynamic result scans', () => {
    const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');
    const dynamicScan = contentSource.slice(
      contentSource.indexOf('function runDynamicScan'),
      contentSource.indexOf('function rescanWithCurrentState'),
    );
    expect(dynamicScan).toContain('injectStyles()');
  });

  it('removes markers and scan attributes', () => {
    document.body.innerHTML = `
      <div data-srb-processed data-srb-domain-blocked data-srb-ad-scanned data-srb-ad-badge data-srb-target-url="https://example.com/">
        <div class="srb-blocked-badge"></div>
        <div class="srb-ad-badge"></div>
      </div>
    `;

    clearAllMarkers();

    expect(document.querySelector('.srb-blocked-badge, .srb-ad-badge')).toBeNull();
    expect(document.querySelector('[data-srb-processed], [data-srb-domain-blocked], [data-srb-ad-scanned], [data-srb-ad-badge], [data-srb-target-url]')).toBeNull();
  });
});
