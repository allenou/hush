<script lang="ts">
  import { onMount } from 'svelte';
  import type { BlockItem, SearchRecord } from '@/utils/storage';
  import {
    addBlockedUrl,
    addDomain,
    get,
    getAllBlocked,
    removeBlockedItem,
    setBlockAds,
    setBlockSubdomains,
    setRecordSearchHistory,
    subscribe,
  } from '@/utils/storage';
  import { getSearchUrl } from '@/helpers/search-engines';
  import type { TabId, RuleFilter } from '@/constants';
  import { t, initLocale, setLocale as setAppLocale, getLocale } from '@/utils/locale-store.svelte';
  import { setStoredLocale } from '@/utils/storage';

  import AppNav from './components/AppNav.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import RulesTab from './components/RulesTab.svelte';
  import SearchHistoryTab from './components/SearchHistoryTab.svelte';
  import SettingsTab from './components/SettingsTab.svelte';
  import AddRuleDialog from './components/AddRuleDialog.svelte';

  let blockedItems = $state<BlockItem[]>([]);
  let errorMsg = $state('');
  let blockAds = $state(false);
  let blockSubdomains = $state(true);
  let activeFilter = $state<RuleFilter>('all');
  let searchQuery = $state('');
  let activeTab = $state<TabId>('dashboard');
  let showAddDialog = $state(false);
  let totalBlockCount = $state(0);
  let adBlockCount = $state(0);
  let domainBlockCount = $state(0);
  let todayBlockCount = $state(0);
  let weekStats = $state<{ date: string; count: number }[]>([]);
  let topBlockedDomains = $state<{ domain: string; count: number }[]>([]);
  let searchHistory = $state<SearchRecord[]>([]);
  let recordSearchHistory = $state(true);

  function buildWeekStats(raw: { date: string; count: number }[]): { date: string; count: number }[] {
    const result: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = raw.find(s => s.date === key);
      result.push({ date: key, count: found?.count ?? 0 });
    }
    return result;
  }

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

  async function handleLocaleChange(newLocale: string) {
    await setAppLocale(newLocale);
    await setStoredLocale(newLocale);
  }

  async function loadData() {
    const storage = await get();
    if (!storage.locale) {
      await initLocale();
    } else {
      await initLocale(storage.locale);
    }
    blockedItems = await getAllBlocked();
    blockAds = storage.blockAds ?? false;
    blockSubdomains = storage.blockSubdomains ?? true;
    totalBlockCount = storage.blockCount ?? 0;
    adBlockCount = storage.adBlockCount ?? 0;
    domainBlockCount = storage.domainBlockCount ?? 0;
    topBlockedDomains = storage.blockedDomainStats ?? [];
    searchHistory = storage.searchHistory ?? [];
    recordSearchHistory = storage.recordSearchHistory ?? true;
    weekStats = buildWeekStats(storage.stats ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayBlockCount = todayStat?.count ?? 0;
  }

  async function handleAdd(value: string) {
    if (!value) return;
    errorMsg = '';
    try {
      const { urls, blockedUrls } = await get();
      if (value.startsWith('http') && new URL(value).pathname !== '/') {
        if (blockedUrls.includes(value)) { errorMsg = t('errorDuplicateUrl'); return; }
        await addBlockedUrl(value);
      } else {
        const domain = value.startsWith('http')
          ? new URL(value).hostname.replace(/^www\./, '')
          : value.replace(/^www\./, '');
        new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        if (urls.includes(domain)) { errorMsg = t('errorDuplicateDomain'); return; }
        await addDomain(domain);
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
    chrome.tabs.create({ url });
  }

  let totalCount = $derived(blockedItems.length);
  let domainCount = $derived(blockedItems.filter((item) => item.type === 'domain').length);
  let urlCount = $derived(blockedItems.filter((item) => item.type === 'url').length);
  let selectorCount = $derived(blockedItems.filter((item) => item.type === 'selector').length);
  let maxCount = $derived(Math.max(...weekStats.map(s => s.count), 1));
  let adPct = $derived(totalBlockCount > 0 ? Math.round((adBlockCount / totalBlockCount) * 100) : 0);
  let domainPct = $derived(totalBlockCount > 0 ? Math.round((domainBlockCount / totalBlockCount) * 100) : 0);
  let otherPct = $derived(Math.max(0, 100 - adPct - domainPct));
  let filteredItems = $derived(blockedItems.filter((item) =>
    (activeFilter === 'all' || item.type === activeFilter) && matchesQuery(item, searchQuery),
  ));

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="app">
  <AppNav {activeTab} onTabChange={(tab) => activeTab = tab} />

  <main class="main">
    {#if activeTab === 'dashboard'}
      <Dashboard
        {totalBlockCount} {todayBlockCount} {totalCount}
        {adBlockCount} {domainBlockCount} {adPct} {domainPct} {otherPct}
        {weekStats} {maxCount}
        topBlockedDomains={topBlockedDomains}
      />

    {:else if activeTab === 'rules'}
      <RulesTab
        {filteredItems} {totalCount}
        {activeFilter} {searchQuery}
        onAddRule={openAddDialog}
        onFilterChange={(filter: RuleFilter) => activeFilter = filter}
        onRemove={(item) => handleRemove(item)}
      />

    {:else if activeTab === 'search'}
      <SearchHistoryTab
        {searchHistory}
        onSearch={(detail) => doSearch(detail.record, detail.engineHostname)}
      />

    {:else}
      <SettingsTab
        {blockAds} {blockSubdomains} {recordSearchHistory}
        currentLocale={getLocale()}
        onLocaleChange={handleLocaleChange}
        onToggleAdBlock={toggleAdBlock}
        onToggleSubdomain={toggleSubdomainBlock}
        onToggleRecordSearch={toggleRecordSearch}
      />
    {/if}
  </main>

  <AddRuleDialog
    show={showAddDialog}
    errorMsg={errorMsg}
    onClose={closeAddDialog}
    onAdd={(val) => handleAdd(val)}
  />
</div>

<style>
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
    max-width: var(--srb-options-max-width);
    margin: 0 auto;
    padding: var(--srb-space-2xl);
  }

  @media (max-width: 1100px) {
    :global(body) { min-width: 0; }
  }
</style>
