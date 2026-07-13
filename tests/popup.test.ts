import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import App from '@/entrypoints/popup/App.svelte';
import { formatLocalDateKey } from '@/utils/statistics';

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
  });
});
