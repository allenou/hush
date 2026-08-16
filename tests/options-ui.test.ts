import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import App from '@/entrypoints/options/App.svelte';
import RulesTab from '@/entrypoints/options/components/RulesTab.svelte';
import SearchHistoryTab from '@/entrypoints/options/components/SearchHistoryTab.svelte';
import SettingsTab from '@/entrypoints/options/components/SettingsTab.svelte';
import Toast from '@/entrypoints/options/components/Toast.svelte';

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
const toastSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/Toast.svelte'),
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

  it('keeps the selected tab in the URL and routes the settings shortcut to the settings tab', () => {
    expect(appSource).toContain("params.set('tab', tab);");
    expect(appSource).toContain("setActiveTab('method')");
    expect(appSource).toContain('onhashchange={syncActiveTabFromLocation}');
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
    expect(settingsSource).toContain('class="settings-layout"');
    expect(settingsSource).toContain('class="settings-main"');
    expect(settingsSource).toContain('class="settings-aside"');
  });

  it('keeps backup buttons at content width', () => {
    expect(settingsSource).not.toMatch(/\.backup-btn\s*\{[^}]*flex:\s*1;/s);
  });

  it('uses a bordered danger button for clearing data without tinting the data row', () => {
    expect(settingsSource).toMatch(/\.clear-data-btn\s*\{[^}]*border-color:\s*var\(--srb-danger-border\);/s);
    expect(settingsSource).not.toMatch(/\.data-item-danger\s+strong\s*\{[^}]*color:/s);
  });

  it('starts backup export and import from the data section', () => {
    const onExportBackup = vi.fn();
    const onImportBackup = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: { onExportBackup, onImportBackup },
    });

    const backupButtons = target.querySelectorAll<HTMLButtonElement>('.backup-btn');
    expect(backupButtons).toHaveLength(2);
    backupButtons[0].click();
    expect(onExportBackup).toHaveBeenCalledTimes(1);

    const file = new File(['{}'], 'hush-backup.json', { type: 'application/json' });
    const input = target.querySelector<HTMLInputElement>('.backup-input');
    expect(input).not.toBeNull();
    Object.defineProperty(input!, 'files', { value: [file], configurable: true });
    input?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onImportBackup).toHaveBeenCalledWith(file);
  });

  it('keeps data maintenance out of the primary settings column', () => {
    expect(settingsSource).toContain('class="side-section data-section"');
  });

  it('shows concise descriptions under the privacy and data section titles', () => {
    expect(settingsSource).toContain("t('privacyNotice')");
    expect(settingsSource).toContain("t('dataNotice')");
  });

  it('shows settings operation feedback as a transient toast', () => {
    expect(appSource).toContain("import Toast from './components/Toast.svelte';");
    expect(appSource).toContain('<Toast {toast} />');
    expect(settingsSource).not.toContain('reset-settings-status');
    expect(toastSource).toContain('position: fixed;');
    expect(toastSource).toContain('}, 3000);');
  });

  it('automatically dismisses a toast after three seconds', async () => {
    vi.useFakeTimers();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(Toast, {
      target,
      props: { toast: { id: 1, message: '已恢复默认页面处理' } },
    });

    await tick();
    expect(target.querySelector('[role="status"]')?.textContent).toContain('已恢复默认页面处理');

    await vi.advanceTimersByTimeAsync(3000);
    await tick();
    expect(target.querySelector('[role="status"]')).toBeNull();
    vi.useRealTimers();
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

  it('keeps the global enabled status out of the options navigation', () => {
    expect(navSource).not.toContain('rule-badge');
    expect(navSource).not.toContain("t(enabled ? 'enabled' : 'disabled')");
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

  it('shows the local recording notice only while search history recording is enabled', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SearchHistoryTab, {
      target,
      props: { searchHistory: [], recordSearchHistory: true },
    });

    expect(target.querySelector('.search-recording-notice')?.textContent)
      .toContain('searchHistoryRecordingNotice');
    expect(target.querySelector('.history-clear')).toBeNull();
  });

  it('explains that recording is off when the history list is empty', () => {
    const onOpenSettings = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SearchHistoryTab, {
      target,
      props: { searchHistory: [], recordSearchHistory: false, onOpenSettings },
    });

    expect(target.querySelector('.empty p')?.textContent).toContain('noHistoryDisabledDesc');
    expect(target.querySelector('.empty-settings-link')?.textContent).toContain('settingsPageTitle');
    expect(target.querySelector('.empty p')?.textContent).toContain('enableHistoryInSettings');
    const chineseMessages = JSON.parse(readFileSync(
      resolve(process.cwd(), 'public/_locales/zh_CN/messages.json'),
      'utf8',
    )) as Record<string, { message: string }>;
    expect(
      chineseMessages.noHistoryDisabledDesc.message
      + chineseMessages.settingsPageTitle.message
      + chineseMessages.enableHistoryInSettings.message,
    ).toBe('搜索记录功能未开启，你可前往设置开启。');
    expect(target.querySelector('.history-clear')).toBeNull();
    target.querySelector<HTMLButtonElement>('.empty-settings-link')?.click();
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
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

  it('keeps subdomain matching off by default', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, { target });

    expect(target.querySelector<HTMLInputElement>('[data-testid="subdomain-toggle"]')?.checked)
      .toBe(false);
  });

  it('keeps search history recording off by default', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, { target });

    expect(target.querySelector<HTMLInputElement>('[data-testid="search-history-toggle"]')?.checked)
      .toBe(false);
  });

  it('requires confirmation before resetting page handling', async () => {
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => ({
      resetPageHandlingLabel: '重置页面处理',
      resetPageHandlingDesc: '恢复默认页面处理',
      resetPageHandlingAction: '恢复默认页面处理',
      resetPageHandlingConfirm: '确定恢复默认页面处理吗？',
      cancel: '取消',
    })[key] ?? '');
    const onResetPageHandling = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: { onResetPageHandling },
    });

    target.querySelector<HTMLButtonElement>('.reset-settings-btn')?.click();
    await tick();

    expect(onResetPageHandling).not.toHaveBeenCalled();
    expect(target.querySelector('#confirm-dialog-message')?.textContent)
      .toBe('确定恢复默认页面处理吗？');

    target.querySelector<HTMLButtonElement>('[role="dialog"] .btn-danger')?.click();
    await vi.waitFor(() => {
      expect(onResetPageHandling).toHaveBeenCalledTimes(1);
      expect(target.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  it('clears session overrides when resetting page handling', () => {
    const handler = appSource.slice(
      appSource.indexOf('async function handleResetPageHandling()'),
      appSource.indexOf('async function loadData()'),
    );
    expect(handler).toContain('resetPageHandling()');
    expect(handler).toContain('clearTemporaryBlocking()');
  });

  it('uses handling modes instead of parent category switches', async () => {
    const onToggleRuleEnabled = vi.fn();
    const onRuleDisplayModeChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: {
        blockDomains: true,
        blockUrls: false,
        blockSelectors: false,
        onToggleRuleEnabled,
        onRuleDisplayModeChange,
      },
    });

    expect(target.querySelector('[data-testid="domain-display-mode-row"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="url-display-mode-row"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="selector-display-mode-row"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="domain-block-toggle"]')).toBeNull();

    target.querySelector<HTMLButtonElement>('[data-testid="url-display-mode-row"]')?.click();
    await tick();
    target.querySelector<HTMLButtonElement>('.mode-menu [data-mode="mark"]')?.click();

    await vi.waitFor(() => {
      expect(onRuleDisplayModeChange).toHaveBeenCalledWith('url', 'mark');
      expect(onToggleRuleEnabled).toHaveBeenCalledWith('url');
    });
  });

  it('applies a hide display mode without a confirmation dialog', async () => {
    const onRuleDisplayModeChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: { onRuleDisplayModeChange },
    });

    target.querySelector<HTMLButtonElement>('[data-testid="domain-display-mode-row"]')?.click();
    await tick();
    expect(target.querySelector('.mode-menu')).not.toBeNull();

    target.querySelector<HTMLButtonElement>('.mode-menu [data-mode="hide"]')?.click();
    await vi.waitFor(() => {
      expect(onRuleDisplayModeChange).toHaveBeenCalledWith('domain', 'hide');
      expect(target.querySelector('.mode-menu')).toBeNull();
      expect(target.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  it('requires confirmation every time ad hiding is selected', async () => {
    const onAdDisplayModeChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(SettingsTab, {
      target,
      props: { onAdDisplayModeChange },
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      target.querySelector<HTMLButtonElement>('[data-testid="ad-display-mode-row"]')?.click();
      await tick();
      target.querySelector<HTMLButtonElement>('.mode-menu [data-mode="hide"]')?.click();
      await tick();

      expect(target.querySelector('[role="dialog"]')).not.toBeNull();
      expect(onAdDisplayModeChange).toHaveBeenCalledTimes(attempt);

      target.querySelector<HTMLButtonElement>('[role="dialog"] .btn-danger')?.click();
      await vi.waitFor(() => {
        expect(onAdDisplayModeChange).toHaveBeenCalledTimes(attempt + 1);
      });
    }
  });
});
