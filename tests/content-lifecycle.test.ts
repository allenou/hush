import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clearAllMarkers } from '@/helpers/ad-blocker';

describe('marking lifecycle', () => {
  it('checks for page-world SPA URL changes during result mutations', () => {
    const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');
    expect(contentSource).toContain('handleUrlChange(window.location.href)');
  });

  it('removes markers, scan attributes, and the collapse bar', () => {
    document.body.innerHTML = `
      <div id="srb-collapse-bar"></div>
      <div data-srb-processed data-srb-domain-blocked data-srb-ad-scanned data-srb-ad-badge>
        <div class="srb-blocked-badge"></div>
        <div class="srb-cancel-badge"></div>
        <div class="srb-ad-badge"></div>
      </div>
    `;

    clearAllMarkers();

    expect(document.querySelector('.srb-blocked-badge, .srb-cancel-badge, .srb-ad-badge')).toBeNull();
    expect(document.getElementById('srb-collapse-bar')).toBeNull();
    expect(document.querySelector('[data-srb-processed], [data-srb-domain-blocked], [data-srb-ad-scanned], [data-srb-ad-badge]')).toBeNull();
  });
});
