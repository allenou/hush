import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('content script locale fallback', () => {
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
});
