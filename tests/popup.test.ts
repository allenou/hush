import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import App from '@/entrypoints/popup/App.svelte';
import { mountPopup } from '@/entrypoints/popup/bootstrap';
import { formatLocalDateKey } from '@/utils/statistics';
import packageJson from '../package.json';

vi.mock('@/utils/chart', () => ({
  Chart: class {
    update(): void {}
    destroy(): void {}
  },
}));

describe('Popup', () => {
  let component: ReturnType<typeof mount> | undefined;

  afterEach(async () => {
    if (component) await unmount(component);
    component = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders the stored English locale on the first popup frame', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        locale: 'en',
        blockCount: 0,
        enabled: true,
      },
    });
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([]);
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('zh-CN');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      totalBlockedLabel: '全部拦截',
      todayLabel: '今日',
    })[key] ?? key);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        totalBlockedLabel: { message: 'Total Blocked' },
        todayLabel: { message: 'Today' },
        siteUnavailable: { message: 'Unavailable on this page' },
        siteUnavailableShort: { message: 'Unavailable' },
      }),
    } as Response);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = await mountPopup(target);

    const summary = target.querySelector('.stats-grid')?.textContent ?? '';
    expect(summary).toContain('Total Blocked');
    expect(summary).toContain('Today');
    expect(summary).not.toContain('全部拦截');
    expect(document.documentElement.lang).toBe('en');

    await vi.waitFor(() => {
      expect(target.querySelector('.header-unavailable')?.textContent).toContain('Unavailable');
      expect(target.querySelector('.site-status')).toBeNull();
    });
  });

  it('keeps summary values in the DOM and renders one accessible trend chart', async () => {
    const today = formatLocalDateKey(new Date());
    await fakeBrowser.storage.local.set({
      blocker: {
        blockCount: 12,
        enabled: true,
        stats: [{ date: today, count: 3 }],
      },
    });
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([]);
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => (
      key === 'popupTrendAria' ? '7-day block trend chart' : key
    ));

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      const summary = target.querySelector('.stats-grid')?.textContent ?? '';
      expect(summary).toContain('12');
      expect(summary).toContain('3');
    });

    const charts = target.querySelectorAll<HTMLCanvasElement>('canvas[role="img"]');
    expect(charts).toHaveLength(1);
    expect(charts[0]?.getAttribute('aria-label')).toBe('7-day block trend chart');
    expect(target.querySelector('.bar-wrapper')).toBeNull();
    expect(target.querySelector('.version')?.textContent).toBe(`v${packageJson.version}`);
  });

  it('shows a parent-domain rule as blocked when subdomain matching is enabled', async () => {
    await fakeBrowser.storage.local.set({
      blocker: {
        urls: ['example.com'],
        blockSubdomains: true,
      },
    });
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([{
      id: 1,
      index: 0,
      highlighted: true,
      active: true,
      pinned: false,
      incognito: false,
      url: 'https://sub.example.com/search',
    }]);
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      siteBlocked: 'Current site is blocked',
      siteNormal: 'Current site is normal',
    })[key] ?? key);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      expect(target.querySelector('.site-status')?.textContent).toContain('Current site is blocked');
    });
  });
});
