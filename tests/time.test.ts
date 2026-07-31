import { describe, expect, it, vi } from 'vitest';

describe('relative time formatting', () => {
  it('maps the extension Chinese locale to a valid date locale', async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({}),
    })));

    const { setLocale } = await import('@/utils/locale');
    const { DAY_MS, formatRelativeTime } = await import('@/utils/time');
    await setLocale('zh_CN');

    const toLocaleDateString = vi.spyOn(Date.prototype, 'toLocaleDateString');
    formatRelativeTime(Date.now() - DAY_MS * 2);

    expect(toLocaleDateString).toHaveBeenCalledWith('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  });
});
