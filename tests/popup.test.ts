import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import App from '@/entrypoints/popup/App.svelte';
import { mountPopup } from '@/entrypoints/popup/bootstrap';
import { formatLocalDateKey } from '@/utils/statistics';
import packageJson from '../package.json';

const popupSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/popup/App.svelte'),
  'utf8',
);

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
      currentSiteStatsLabel: '当前站点',
      todayLabel: '今日',
    })[key] ?? key);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        currentSiteStatsLabel: { message: 'Current site' },
        searchPageOnlyShort: { message: 'Search pages only' },
        todayLabel: { message: 'Today' },
        times: { message: 'times' },
        siteUnavailable: { message: 'Unavailable on this page' },
        siteUnavailableShort: { message: 'Unavailable' },
        searchEnginePageHint: { message: 'Currently supported on these search engines' },
        supportedSearchEngines: { message: '$1' },
        searchEngineGoogle: { message: 'Google' },
        searchEngineBaidu: { message: 'Baidu' },
        searchEngineBing: { message: 'Bing' },
        searchEngineSo: { message: '360 So' },
        searchEngineSogou: { message: 'Sogou' },
        searchEngineYahoo: { message: 'Yahoo!' },
        searchEngineYandex: { message: 'Yandex' },
        searchEngineDuckDuckGo: { message: 'DuckDuckGo' },
      }),
    } as Response);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = await mountPopup(target);

    const summary = target.querySelector('.stats-grid')?.textContent ?? '';
    expect(summary).toContain('Current site');
    expect(summary).toContain('Today');
    expect(summary).not.toContain('当前站点');
    expect(document.documentElement.lang).toBe('en');

    await vi.waitFor(() => {
      expect(target.querySelector('.header-unavailable')?.textContent).toContain('Unavailable');
      expect(target.querySelector('.chart-empty-state')).toBeNull();
    });

    target.querySelector<HTMLButtonElement>('.current-site-card')?.click();

    await vi.waitFor(() => {
      const emptyState = target.querySelector('.chart-empty-state')?.textContent ?? '';
      expect(emptyState).toContain('Currently supported on these search engines');
      expect(emptyState).toContain('Google');
      expect(emptyState).toContain('Bing');
      expect(emptyState).toContain('360 So');
      expect(emptyState).toContain('Sogou');
      expect(emptyState).toContain('Yahoo!');
      expect(emptyState).toContain('Yandex');
      expect(emptyState).toContain('DuckDuckGo');
      expect(emptyState).not.toContain('搜狗');
    });
  });

  it('shows the unsupported-page hint inside the fixed-height chart after selecting the site card', async () => {
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
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      searchPageOnlyShort: 'Search pages only',
      todayLabel: 'Today',
      todayChartTitle: "Today's block types",
      todayBarChartAria: "Today's block type bar chart",
      domainLabel: 'Domain',
      subdomainStatsLabel: 'Subdomain',
      adLabel: 'Ads',
      otherLabel: 'Other',
      searchEnginePageHint: 'Currently supported on these search engines',
      supportedSearchEngines: '$1',
      siteUnavailableShort: 'Unavailable',
      searchEngineGoogle: 'Google',
      searchEngineBaidu: 'Baidu',
      searchEngineBing: 'Bing',
      searchEngineSo: '360 So',
      searchEngineSogou: 'Sogou',
      searchEngineYahoo: 'Yahoo!',
      searchEngineYandex: 'Yandex',
      searchEngineDuckDuckGo: 'DuckDuckGo',
    })[key] ?? key);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      expect(target.querySelector('.current-site-card .site-stat-value')?.textContent?.trim())
        .toBe('—');
      expect(target.querySelector('.today-card .stat-value')?.textContent).toContain('3');
      expect(target.querySelector('.stats-grid')?.textContent).not.toContain('12');
      expect(target.querySelector<HTMLButtonElement>('.current-site-card')?.disabled).toBe(false);
      expect(target.querySelector('.today-card')?.getAttribute('aria-pressed')).toBe('true');
      expect(target.querySelector('.chart-label')?.textContent)
        .toContain("Today's block types");
      expect(target.querySelector('.chart-empty-state')).toBeNull();
    });

    expect(popupSource).toMatch(/\.site-bar-chart\s*\{[^}]*height:\s*112px;/s);
    expect(popupSource).toMatch(/\.chart-empty-state\s*\{[^}]*height:\s*112px;/s);

    target.querySelector<HTMLButtonElement>('.current-site-card')?.click();

    await vi.waitFor(() => {
      const emptyState = target.querySelector('.chart-empty-state');
      expect(target.querySelector('.current-site-card')?.getAttribute('aria-pressed')).toBe('true');
      expect(emptyState?.textContent)
        .toContain('Currently supported on these search engines');
      expect(emptyState?.querySelector('.empty-state-icon svg')).not.toBeNull();
      const content = emptyState?.querySelector('.empty-state-content');
      expect(Array.from(content?.children ?? []).map((element) => element.classList[0]))
        .toEqual(['empty-state-icon', 'empty-state-title-row', 'supported-engines']);
      expect(target.querySelectorAll('.bar-column')).toHaveLength(0);
    });

    expect(target.querySelector('canvas')).toBeNull();
    expect(target.querySelector('.chart-section')).not.toBeNull();
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
      unblockDomain: 'Unblock this domain',
      searchEnginePageHint: 'Currently supported on these search engines',
      supportedSearchEngines: '$1',
      searchEngineGoogle: 'Google',
      searchEngineBaidu: 'Baidu',
      searchEngineBing: 'Bing',
      searchEngineSo: '360 So',
      searchEngineSogou: 'Sogou',
      searchEngineYahoo: 'Yahoo!',
      searchEngineYandex: 'Yandex',
      searchEngineDuckDuckGo: 'DuckDuckGo',
    })[key] ?? key);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      expect(target.querySelector('.current-site-card .site-stat-value')?.textContent?.trim())
        .toBe('—');
      expect(target.querySelector('.chart-empty-state')).toBeNull();
    });

    target.querySelector<HTMLButtonElement>('.current-site-card')?.click();

    await vi.waitFor(() => {
      expect(target.querySelector('.chart-empty-state')?.textContent)
        .toContain('Current site is blocked');
    });

    const unblockButton = target.querySelector<HTMLButtonElement>('.unblock-site-btn');
    expect(unblockButton?.textContent).toContain('Unblock this domain');
    unblockButton?.click();

    await vi.waitFor(async () => {
      const stored = await fakeBrowser.storage.local.get('blocker');
      expect(stored.blocker.urls).toEqual([]);
      expect(target.querySelector('.chart-empty-state')?.textContent)
        .toContain('Currently supported on these search engines');
    });
  });

  it('links the current-site and today cards to the same bar chart', async () => {
    const today = formatLocalDateKey(new Date());
    await fakeBrowser.storage.local.set({
      blocker: {
        blockCount: 18,
        enabled: true,
        stats: [{
          date: today,
          count: 10,
          adCount: 3,
          targetDomainCount: 2,
          subdomainCount: 1,
          urlCount: 2,
          selectorCount: 2,
        }],
      },
    });
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([{
      id: 7,
      index: 0,
      highlighted: true,
      active: true,
      pinned: false,
      incognito: false,
      url: 'https://www.google.com/search?q=hush',
    }]);
    vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockResolvedValue({
      count: 6,
      adCount: 2,
      domainCount: 3,
      urlCount: 1,
      selectorCount: 0,
    });
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => {
      return ({
        currentSiteStatsLabel: 'Current site',
        currentPageItemsUnit: 'items',
        currentSiteChartTitle: 'Page block types',
        todayChartTitle: "Today's block types",
        currentSiteBarChartAria: 'Current-site block type bar chart',
        todayBarChartAria: "Today's block type bar chart",
        domainLabel: 'Domain',
        filterUrl: 'URL',
        adLabel: 'Ads',
        pageElementLabel: 'Element',
        todayLabel: 'Today',
      })[key] ?? key;
    });

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      const siteCard = target.querySelector('.current-site-card')?.textContent ?? '';
      expect(siteCard).toContain('Current site');
      expect(siteCard).toContain('6');
      expect(siteCard).toContain('items');
      expect(siteCard).toContain('Google');
      expect(target.querySelector('.site-signal')).toBeNull();

      expect(target.querySelector('.page-summary')).toBeNull();
      expect(target.querySelector('.current-site-card')?.getAttribute('aria-pressed')).toBe('true');
      expect(target.querySelector('.chart-label')?.textContent).toContain('Page block types');
      expect(target.querySelectorAll('.bar-column')).toHaveLength(4);
      expect(target.querySelector('.bar-column.domain .bar-value')?.textContent).toContain('3');
      expect(target.querySelector('.bar-column.url .bar-value')?.textContent).toContain('1');
      expect(target.querySelector('.bar-column.ad .bar-value')?.textContent).toContain('2');
      expect(target.querySelector('.bar-column.selector .bar-value')?.textContent).toContain('0');
      expect(target.querySelector<HTMLElement>('.bar-fill.domain')?.style.height).toBe('100%');
      expect(target.querySelector<HTMLElement>('.bar-fill.url')?.style.height).toBe('33%');
      expect(target.querySelector<HTMLElement>('.bar-fill.ad')?.style.height).toBe('67%');
      expect(target.querySelector<HTMLElement>('.bar-fill.selector')?.style.height).toBe('4%');
    });

    target.querySelector<HTMLButtonElement>('.today-card')?.click();

    await vi.waitFor(() => {
      expect(target.querySelector('.today-card')?.getAttribute('aria-pressed')).toBe('true');
      expect(target.querySelector('.chart-label')?.textContent)
        .toContain("Today's block types");
      expect(target.querySelector('.bar-column.domain .bar-value')?.textContent).toContain('3');
      expect(target.querySelector('.bar-column.url .bar-value')?.textContent).toContain('2');
      expect(target.querySelector('.bar-column.ad .bar-value')?.textContent).toContain('3');
      expect(target.querySelector('.bar-column.selector .bar-value')?.textContent).toContain('2');
      expect(target.querySelector<HTMLElement>('.bar-fill.domain')?.style.height).toBe('100%');
      expect(target.querySelector<HTMLElement>('.bar-fill.url')?.style.height).toBe('67%');
      expect(target.querySelector<HTMLElement>('.bar-fill.ad')?.style.height).toBe('100%');
      expect(target.querySelector<HTMLElement>('.bar-fill.selector')?.style.height).toBe('67%');
    });

    target.querySelector<HTMLButtonElement>('.current-site-card')?.click();

    await vi.waitFor(() => {
      expect(target.querySelector('.current-site-card')?.getAttribute('aria-pressed')).toBe('true');
      expect(target.querySelector('.chart-label')?.textContent).toContain('Page block types');
      expect(target.querySelector('.bar-column.url .bar-value')?.textContent).toContain('1');
    });

    expect(target.querySelector('canvas')).toBeNull();
  });
});
