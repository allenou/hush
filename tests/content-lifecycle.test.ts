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

  it('reloads content-script translations before rescanning stored state', () => {
    const contentSource = readFileSync(resolve(process.cwd(), 'src/entrypoints/content.ts'), 'utf8');
    const storageSubscription = contentSource.slice(
      contentSource.indexOf('const unsubscribeStorage'),
      contentSource.indexOf('ctx.onInvalidated(unsubscribeStorage)'),
    );
    expect(storageSubscription).toContain('initLocale(storage.locale)');
    expect(storageSubscription.indexOf('initLocale(storage.locale)'))
      .toBeLessThan(storageSubscription.indexOf('rescanWithCurrentState()'));
  });

  it('removes markers and scan attributes', () => {
    document.body.innerHTML = `
      <div data-hush-processed data-hush-domain-blocked data-hush-ad-scanned data-hush-ad-badge data-hush-ad-hidden data-hush-rule-hidden data-hush-rule-type="domain" data-hush-target-url="https://example.com/">
        <div class="hush-blocked-badge"></div>
        <div class="hush-ad-badge"></div>
      </div>
    `;

    clearAllMarkers();

    expect(document.querySelector('.hush-blocked-badge, .hush-ad-badge')).toBeNull();
    expect(document.querySelector('[data-hush-processed], [data-hush-domain-blocked], [data-hush-ad-scanned], [data-hush-ad-badge], [data-hush-ad-hidden], [data-hush-rule-hidden], [data-hush-target-url]')).toBeNull();
  });
});
