import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import App from '@/entrypoints/options/App.svelte';
import RulesTab from '@/entrypoints/options/components/RulesTab.svelte';
import SearchHistoryTab from '@/entrypoints/options/components/SearchHistoryTab.svelte';
import SettingsTab from '@/entrypoints/options/components/SettingsTab.svelte';

vi.mock('@/utils/chart', () => ({
  Chart: class {
    update(): void {}
    destroy(): void {}
  },
}));

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/Dashboard.svelte'),
  'utf8',
);
const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/SettingsTab.svelte'),
  'utf8',
);
const navSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/AppNav.svelte'),
  'utf8',
);
const rulesSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/RulesTab.svelte'),
  'utf8',
);
const appSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/App.svelte'),
  'utf8',
);
const searchHistorySource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/SearchHistoryTab.svelte'),
  'utf8',
);

describe('Options UI', () => {
  let component: ReturnType<typeof mount> | undefined;

  afterEach(async () => {
    if (component) await unmount(component);
    component = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('uses solid card styling for the top-domain empty state', () => {
    expect(dashboardSource).not.toMatch(/\.dash-empty\s*\{[^}]*border:\s*1px dashed/s);
  });

  it('does not show a dashed border around the rules empty state', () => {
    expect(rulesSource).not.toMatch(/\.empty\s*\{[^}]*border:\s*1px dashed/s);
  });

  it('does not show a dashed border around the search history empty state', () => {
    expect(searchHistorySource).not.toMatch(/\.empty\s*\{[^}]*border:\s*1px dashed/s);
  });

  it('does not use the native confirm dialog for clearing search history', () => {
    expect(appSource).not.toMatch(/confirm\(t\('clearHistoryConfirm'\)\)/);
  });

  it('reserves scrollbar space to prevent tab layout shifts', () => {
    expect(appSource).toMatch(/:global\(html\)\s*\{[^}]*scrollbar-gutter:\s*stable;/s);
  });

  it('aligns the main content edges with the options header', () => {
    expect(appSource).toContain('--srb-options-page-gutter: var(--srb-space-2xl);');
    expect(appSource).toMatch(/\.main\s*\{[^}]*max-width:\s*calc\([\s\S]*var\(--srb-options-max-width\)[\s\S]*var\(--srb-options-page-gutter\)[\s\S]*var\(--srb-options-page-gutter\)[\s\S]*\);/);
    expect(appSource).toContain('padding: var(--srb-space-2xl) var(--srb-options-page-gutter);');
    expect(navSource).toContain('padding: 0 var(--srb-options-page-gutter);');
  });

  it('keeps settings sections aligned to the shared content width', () => {
    expect(settingsSource).not.toContain('max-width: var(--srb-settings-width);');
    expect(settingsSource).toMatch(/\.settings-page\s*\{[^}]*width:\s*100%;/s);
    expect(settingsSource).toMatch(/\.settings-card\s*\{[^}]*background:\s*var\(--srb-surface\);/s);
    expect(settingsSource).toContain('<section class="settings-card wide" aria-labelledby="history-heading">');
  });

  it('keeps backup buttons at content width', () => {
    expect(settingsSource).not.toMatch(/\.backup-btn\s*\{[^}]*flex:\s*1;/s);
  });

  it('places the language switcher in the options header', () => {
    expect(navSource).toContain('class="locale-switcher"');
    expect(navSource).toContain("onLocaleChange?.(currentLocale === 'zh_CN' ? 'en' : 'zh_CN')");
    expect(navSource).not.toContain('locale-icon');
    expect(settingsSource).not.toContain('language-heading');
  });

  it('uses only a background for the active nav item', () => {
    expect(navSource).not.toContain('.nav-link.active::after');
  });

  it('renders the disabled storage state in the options navigation', async () => {
    await fakeBrowser.storage.local.set({ blocker: { enabled: false } });
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      enabled: 'Enabled',
      disabled: 'Disabled',
    })[key] ?? key);

    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(App, { target });

    await vi.waitFor(() => {
      const badge = target.querySelector('.rule-badge');
      expect(badge?.textContent).toContain('Disabled');
      expect(badge?.classList.contains('disabled')).toBe(true);
    });
  });

  it('hides search and filters when there are no rules', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(RulesTab, {
      target,
      props: { totalCount: 0, filteredItems: [] },
    });

    expect(target.querySelector('.search-box')).toBeNull();
    expect(target.querySelector('.filter-tabs')).toBeNull();
    expect(target.querySelector('.add-trigger')).not.toBeNull();
  });

  it('reports rule search input changes to the parent', () => {
    const onSearchQueryChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(RulesTab, {
      target,
      props: {
        totalCount: 1,
        filteredItems: [{ type: 'domain', value: 'example.com', index: 0 }],
        onSearchQueryChange,
      },
    });

    const input = target.querySelector<HTMLInputElement>('.search-box')!;
    input.value = 'example';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onSearchQueryChange).toHaveBeenCalledWith('example');
  });

  it('exposes rule filters as a consistent pressed-button group', () => {
    const onFilterChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(RulesTab, {
      target,
      props: {
        totalCount: 1,
        activeFilter: 'domain',
        filteredItems: [{ type: 'domain', value: 'example.com', index: 0 }],
        onFilterChange,
      },
    });

    const filters = Array.from(
      target.querySelectorAll<HTMLButtonElement>('.filter-tabs button'),
    );
    const activeFilter = filters.find((button) => button.classList.contains('active'));

    expect(filters).toHaveLength(4);
    expect(filters.every((button) => button.type === 'button')).toBe(true);
    expect(activeFilter?.getAttribute('aria-pressed')).toBe('true');

    filters.find((button) => button.getAttribute('aria-pressed') === 'false')?.click();
    expect(onFilterChange).toHaveBeenCalledTimes(1);
  });

  it('groups repeat search with engine selection and confirms before clearing history', async () => {
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      searchAction: '再次搜索',
      switchEngine: '切换搜索引擎',
      clearHistory: '清空记录',
      clearHistoryConfirm: '确定清空全部搜索记录吗？',
      cancel: '取消',
    })[key] ?? '');
    const onSearch = vi.fn();
    const onRemove = vi.fn();
    const onClear = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SearchHistoryTab, {
      target,
      props: {
        searchHistory: [{
          query: 'query',
          engineName: 'Google',
          engineHostname: 'google.com',
          timestamp: Date.now(),
        }],
        onSearch,
        onRemove,
        onClear,
      },
    });

    const searchGroup = target.querySelector('.search-action-group')!;
    expect(searchGroup.querySelector('.search-again-btn')?.textContent).toBe('再次搜索');
    expect(searchGroup.querySelector('.search-switch-btn')?.getAttribute('aria-label')).toBe('切换搜索引擎');
    searchGroup.querySelector<HTMLButtonElement>('.search-again-btn')?.click();
    searchGroup.querySelector<HTMLButtonElement>('.search-switch-btn')?.click();
    await tick();

    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({
      record: expect.objectContaining({ query: 'query' }),
    }));
    expect(searchGroup.querySelector('.search-engine-menu')).not.toBeNull();
    expect(searchGroup.querySelector('.search-engine-opt.current')).not.toBeNull();
    expect(Array.from(searchGroup.querySelectorAll('.search-engine-opt'))
      .some((option) => option.textContent?.includes('搜狗'))).toBe(true);

    target.querySelector<HTMLButtonElement>('.history-delete')?.click();
    target.querySelector<HTMLButtonElement>('.history-clear')?.click();
    await tick();

    expect(onRemove).toHaveBeenCalledWith(0);
    expect(onClear).not.toHaveBeenCalled();
    expect(target.querySelector('[role="dialog"]')).not.toBeNull();
    expect(target.querySelector('#confirm-dialog-message')?.textContent).toBe('确定清空全部搜索记录吗？');

    target.querySelector<HTMLButtonElement>('.btn-cancel')?.click();
    await tick();
    expect(target.querySelector('[role="dialog"]')).toBeNull();

    target.querySelector<HTMLButtonElement>('.history-clear')?.click();
    await tick();
    target.querySelector<HTMLButtonElement>('.btn-danger')?.click();

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before clearing all Hush data', async () => {
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      clearAllDataLabel: '清空全部数据',
      clearAllDataDesc: '删除 Hush 保存的全部数据',
      clearAllDataAction: '清空 Hush 数据',
      clearAllDataConfirm: '确定清空所有 Hush 数据吗？',
      cancel: '取消',
    })[key] ?? '');
    const onClearAllData = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: { onClearAllData },
    });

    target.querySelector<HTMLButtonElement>('.clear-data-btn')?.click();
    await tick();

    expect(onClearAllData).not.toHaveBeenCalled();
    expect(target.querySelector('[role="dialog"]')).not.toBeNull();
    expect(target.querySelector('#confirm-dialog-message')?.textContent)
      .toBe('确定清空所有 Hush 数据吗？');

    target.querySelector<HTMLButtonElement>('.btn-danger')?.click();
    await vi.waitFor(() => {
      expect(onClearAllData).toHaveBeenCalledTimes(1);
      expect(target.querySelector('[role="dialog"]')).toBeNull();
    });
  });
});
