import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('content script locale fallback', () => {
  it('maps extension locales to document language metadata', async () => {
    vi.resetModules();
    const { setDocumentLocale } = await import('@/utils/locale');

    setDocumentLocale('zh_CN');
    expect(document.documentElement.lang).toBe('zh-CN');

    setDocumentLocale('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('uses chrome.i18n messages after locale JSON loading fails', async () => {
    vi.resetModules();
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('zh-CN');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => {
      if (key === 'domainHit') return '域名命中';
      return '';
    });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('not web accessible');
    }));

    const { initLocale, t } = await import('@/utils/locale');

    await initLocale('zh_CN');

    expect(t('domainHit')).toBe('域名命中');
  });

  it('notifies reactive consumers after initializing the stored locale', async () => {
    vi.resetModules();
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ domainHit: { message: '域名命中' } }),
    })));

    const { initLocale, subscribe, t } = await import('@/utils/locale');
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    await initLocale('zh_CN');

    expect(t('domainHit')).toBe('域名命中');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
