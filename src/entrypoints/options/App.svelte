<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import type {
    BlockedDomainStat,
    BlockItem,
    BlockStats,
    SearchRecord,
    AdDisplayMode,
    RuleEnabledTarget,
    RuleDisplayModeTarget,
  } from '@/utils/storage';
  import {
    addBlockedUrl,
    addDomain,
    get,
    getAllBlocked,
    removeBlockedItem,
    createStorageBackup,
    restoreStorageBackup,
    clearAllData,
    resetPageHandling,
    setBlockAds,
    setRuleEnabled,
    setAdDisplayMode,
    setRuleDisplayMode,
    setBlockSubdomains,
    setRecordSearchHistory,
    removeSearchRecord,
    clearSearchHistory,
    subscribe,
  } from '@/utils/storage';
  import { getSearchUrl } from '@/helpers/search-engines';
  import { formatLocalDateKey } from '@/utils/statistics';
  import { setDocumentLocale } from '@/utils/locale';
  import { TABS, type TabId, type RuleFilter } from '@/constants';
  import { t, initLocale, setLocale as setAppLocale, getLocale } from '@/utils/locale-store.svelte';
  import { setStoredLocale } from '@/utils/storage';
  import { parseRuleInput } from '@/utils/rule-input';

  import AppNav from './components/AppNav.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import RulesTab from './components/RulesTab.svelte';
  import SearchHistoryTab from './components/SearchHistoryTab.svelte';
  import SettingsTab from './components/SettingsTab.svelte';
  import AddRuleDialog from './components/AddRuleDialog.svelte';
  import Toast from './components/Toast.svelte';

  let blockedItems = $state<BlockItem[]>([]);
  let errorMsg = $state('');
  let blockAds = $state(false);
  let blockDomains = $state(true);
  let blockUrls = $state(true);
  let blockSelectors = $state(true);
  let adDisplayMode = $state<AdDisplayMode>('mark');
  let domainDisplayMode = $state<AdDisplayMode>('mark');
  let urlDisplayMode = $state<AdDisplayMode>('mark');
  let selectorDisplayMode = $state<AdDisplayMode>('mark');
  let blockSubdomains = $state(false);
  let activeFilter = $state<RuleFilter>('all');
  let searchQuery = $state('');
  function tabFromLocation(): TabId {
    const tab = new URLSearchParams(window.location.hash.slice(1)).get('tab');
    return TABS.includes(tab as TabId) ? tab as TabId : 'dashboard';
  }

  let activeTab = $state<TabId>(tabFromLocation());
  let showAddDialog = $state(false);
  let totalBlockCount = $state(0);
  let adBlockCount = $state(0);
  let domainBlockCount = $state(0);
  let urlBlockCount = $state(0);
  let selectorBlockCount = $state(0);
  let todayBlockCount = $state(0);
  let dailyStats = $state<BlockStats[]>([]);
  let topBlockedDomains = $state<BlockedDomainStat[]>([]);
  let searchHistory = $state<SearchRecord[]>([]);
  let recordSearchHistory = $state(false);
  let toast = $state<{ id: number; message: string; tone?: 'success' | 'error' } | null>(null);
  let nextToastId = 0;
  let currentLocale = $state('zh_CN');

  function openAddDialog() {
    errorMsg = '';
    showAddDialog = true;
  }

  function closeAddDialog() {
    showAddDialog = false;
    errorMsg = '';
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showAddDialog) closeAddDialog();
  }

  function setActiveTab(tab: TabId) {
    activeTab = tab;
    const params = new URLSearchParams(window.location.hash.slice(1));
    params.set('tab', tab);
    window.history.replaceState(null, '', `#${params.toString()}`);
  }

  function syncActiveTabFromLocation() {
    activeTab = tabFromLocation();
  }

  async function handleLocaleChange(newLocale: string) {
    currentLocale = newLocale;
    await setAppLocale(newLocale);
    await setStoredLocale(newLocale);
    setDocumentLocale(newLocale);
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showToast(message: string, tone: 'success' | 'error' = 'success') {
    toast = { id: ++nextToastId, message, tone };
  }

  async function handleExportBackup() {
    const backup = await createStorageBackup();
    const date = backup.exportedAt.slice(0, 10);
    downloadTextFile(`hush-backup-${date}.json`, JSON.stringify(backup, null, 2));
    showToast(t('backupExported'));
  }

  async function handleImportBackup(file: File) {
    try {
      if (!confirm(t('backupImportConfirm'))) return;
      const raw = await file.text();
      await restoreStorageBackup(JSON.parse(raw));
      await loadData();
      showToast(t('backupImported'));
    } catch {
      showToast(t('backupImportFailed'), 'error');
    }
  }

  async function handleClearAllData() {
    await clearAllData();
    await loadData();
    showToast(t('clearAllDataSuccess'));
  }

  async function handleResetPageHandling() {
    await resetPageHandling();
    await loadData();
    showToast(t('resetPageHandlingSuccess'));
  }

  async function loadData() {
    const storage = await get();
    if (!storage.locale) {
      await initLocale();
    } else {
      await initLocale(storage.locale);
    }
    setDocumentLocale(getLocale());
    currentLocale = getLocale();
    blockedItems = await getAllBlocked();
    blockAds = storage.blockAds ?? false;
    blockDomains = storage.blockDomains ?? true;
    blockUrls = storage.blockUrls ?? true;
    blockSelectors = storage.blockSelectors ?? true;
    adDisplayMode = storage.adDisplayMode ?? 'mark';
    domainDisplayMode = storage.domainDisplayMode ?? 'mark';
    urlDisplayMode = storage.urlDisplayMode ?? 'mark';
    selectorDisplayMode = storage.selectorDisplayMode ?? 'mark';
    blockSubdomains = storage.blockSubdomains ?? false;
    totalBlockCount = storage.blockCount ?? 0;
    adBlockCount = storage.adBlockCount ?? 0;
    domainBlockCount = storage.domainBlockCount ?? 0;
    urlBlockCount = storage.urlBlockCount ?? 0;
    selectorBlockCount = storage.selectorBlockCount ?? 0;
    topBlockedDomains = storage.blockedDomainStats ?? [];
    searchHistory = storage.searchHistory ?? [];
    recordSearchHistory = storage.recordSearchHistory ?? false;
    dailyStats = storage.stats ?? [];
    const today = formatLocalDateKey(new Date());
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayBlockCount = todayStat?.count ?? 0;
  }

  async function handleAdd(value: string) {
    if (!value) return;
    errorMsg = '';
    try {
      const { urls, blockedUrls } = await get();
      const parsed = parseRuleInput(value);
      if (parsed.type === 'url') {
        if (blockedUrls.includes(parsed.value)) { errorMsg = t('errorDuplicateUrl'); return; }
        await addBlockedUrl(parsed.value);
      } else {
        if (urls.includes(parsed.value)) { errorMsg = t('errorDuplicateDomain'); return; }
        await addDomain(parsed.value);
      }
      await loadData();
      closeAddDialog();
    } catch {
      errorMsg = t('errorInvalidInput');
    }
  }

  async function handleRemove(item: BlockItem) {
    await removeBlockedItem(item.type, item.index);
    await loadData();
  }

  async function toggleRecordSearch() {
    recordSearchHistory = !recordSearchHistory;
    await setRecordSearchHistory(recordSearchHistory);
  }

  async function toggleAdBlock() {
    blockAds = !blockAds;
    await setBlockAds(blockAds);
  }

  async function changeAdDisplayMode(mode: AdDisplayMode) {
    adDisplayMode = mode;
    await setAdDisplayMode(mode);
  }

  async function changeRuleDisplayMode(target: RuleDisplayModeTarget, mode: AdDisplayMode) {
    if (target === 'domain') domainDisplayMode = mode;
    else if (target === 'url') urlDisplayMode = mode;
    else selectorDisplayMode = mode;
    await setRuleDisplayMode(target, mode);
  }

  async function toggleRuleEnabled(target: RuleEnabledTarget) {
    if (target === 'domain') blockDomains = !blockDomains;
    else if (target === 'url') blockUrls = !blockUrls;
    else blockSelectors = !blockSelectors;
    const value = target === 'domain' ? blockDomains : target === 'url' ? blockUrls : blockSelectors;
    await setRuleEnabled(target, value);
  }

  async function toggleSubdomainBlock() {
    blockSubdomains = !blockSubdomains;
    await setBlockSubdomains(blockSubdomains);
  }

  function formatTypeLabel(type: BlockItem['type']): string {
    if (type === 'domain') return t('typeDomain');
    if (type === 'url') return t('typeUrl');
    return t('typeSelector');
  }

  function matchesQuery(item: BlockItem, query: string): boolean {
    if (!query.trim()) return true;
    const normalizedQuery = query.trim().toLowerCase();
    return item.value.toLowerCase().includes(normalizedQuery)
      || formatTypeLabel(item.type).toLowerCase().includes(normalizedQuery);
  }

  function doSearch(record: SearchRecord, engineHostname?: string) {
    const url = getSearchUrl(engineHostname || record.engineHostname, record.query);
    browser.tabs.create({ url });
  }

  async function handleRemoveSearchRecord(index: number) {
    await removeSearchRecord(index);
    await loadData();
  }

  async function handleClearSearchHistory() {
    await clearSearchHistory();
    await loadData();
  }

  let totalCount = $derived(blockedItems.length);
  let domainCount = $derived(blockedItems.filter((item) => item.type === 'domain').length);
  let urlCount = $derived(blockedItems.filter((item) => item.type === 'url').length);
  let selectorCount = $derived(blockedItems.filter((item) => item.type === 'selector').length);
  let filteredItems = $derived(blockedItems.filter((item) =>
    (activeFilter === 'all' || item.type === activeFilter) && matchesQuery(item, searchQuery),
  ));

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<svelte:window onkeydown={onWindowKeydown} onhashchange={syncActiveTabFromLocation} />

<div class="app">
  <AppNav
    {activeTab}
    {currentLocale}
    onTabChange={setActiveTab}
    onLocaleChange={handleLocaleChange}
  />

  <main class="main">
    {#if activeTab === 'dashboard'}
      <Dashboard
        {totalBlockCount} {todayBlockCount} {totalCount}
        {adBlockCount} {domainBlockCount} {urlBlockCount} {selectorBlockCount}
        {dailyStats}
        topBlockedDomains={topBlockedDomains}
      />

    {:else if activeTab === 'rules'}
      <RulesTab
        {filteredItems} {totalCount}
        {activeFilter} {searchQuery}
        onAddRule={openAddDialog}
        onFilterChange={(filter: RuleFilter) => activeFilter = filter}
        onSearchQueryChange={(value: string) => searchQuery = value}
        onRemove={(item) => handleRemove(item)}
      />

    {:else if activeTab === 'search'}
      <SearchHistoryTab
        {searchHistory}
        {recordSearchHistory}
        onSearch={(detail) => doSearch(detail.record, detail.engineHostname)}
        onRemove={handleRemoveSearchRecord}
        onClear={handleClearSearchHistory}
        onOpenSettings={() => setActiveTab('method')}
      />

    {:else}
      <SettingsTab
        {blockAds} {blockDomains} {blockUrls} {blockSelectors} {adDisplayMode} {domainDisplayMode} {urlDisplayMode} {selectorDisplayMode} {blockSubdomains} {recordSearchHistory}
        onToggleAdBlock={toggleAdBlock}
        onToggleRuleEnabled={toggleRuleEnabled}
        onAdDisplayModeChange={changeAdDisplayMode}
        onRuleDisplayModeChange={changeRuleDisplayMode}
        onToggleSubdomain={toggleSubdomainBlock}
        onToggleRecordSearch={toggleRecordSearch}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onClearAllData={handleClearAllData}
        onResetPageHandling={handleResetPageHandling}
      />
    {/if}
  </main>

  <AddRuleDialog
    show={showAddDialog}
    errorMsg={errorMsg}
    onClose={closeAddDialog}
    onAdd={(val) => handleAdd(val)}
  />

  <Toast {toast} />
</div>

<style>
  .app {
    --srb-options-page-gutter: var(--srb-space-2xl);
  }
  :global(html) {
    scrollbar-gutter: stable;
  }
  :global(body) {
    margin: 0;
    min-width: var(--srb-options-min-width);
    background: var(--srb-bg);
    color: var(--srb-text);
    font-family: var(--srb-font);
    -webkit-font-smoothing: antialiased;
  }
  :global(*) { box-sizing: border-box; }

  .main {
    max-width: calc(
      var(--srb-options-max-width)
      + var(--srb-options-page-gutter)
      + var(--srb-options-page-gutter)
    );
    margin: 0 auto;
    padding: var(--srb-space-2xl) var(--srb-options-page-gutter);
  }

  @media (max-width: 1100px) {
    :global(body) { min-width: 0; }
  }

  @media (max-width: 760px) {
    .app { --srb-options-page-gutter: var(--srb-space-lg); }
  }

  @media (max-width: 420px) {
    .app { --srb-options-page-gutter: var(--srb-space-md); }
  }
</style>
