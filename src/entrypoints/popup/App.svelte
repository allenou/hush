<script lang="ts">
  import { BUILT_IN_ENGINES, detectSearchEngine } from '@/helpers/search-engines';
  import { get, removeBlockedItem, setEnabled, subscribe } from '@/utils/storage';
  import { extractDomain, findMatchingBlockedDomainIndex } from '@/utils/domain';
  import {
    getSearchEngineDisplayName,
    t,
    initLocale,
  } from '@/utils/locale-store.svelte';
  import { getLocale, setDocumentLocale } from '@/utils/locale';
  import { formatLocalDateKey } from '@/utils/statistics';
  import {
    PAGE_MARKER_SUMMARY_REQUEST,
    isPageMarkerCountMessage,
    isPageMarkerSummary,
  } from '@/utils/page-badge';
  import type { PageMarkerSummary } from '@/utils/page-badge';
  import { onMount } from 'svelte';
  import { browser, type Browser } from 'wxt/browser';
  import packageJson from '../../../package.json';

  const EMPTY_PAGE_MARKER_SUMMARY: PageMarkerSummary = {
    count: 0,
    adCount: 0,
    domainCount: 0,
    urlCount: 0,
    selectorCount: 0,
  };
  type ChartScope = 'site' | 'today';
  type ChartBarKey = 'domain' | 'url' | 'ad' | 'selector' | 'legacy';

  let todayCount = 0;
  let todayBreakdown = {
    adCount: 0,
    targetDomainCount: 0,
    subdomainCount: 0,
    urlCount: 0,
    selectorCount: 0,
    otherCount: 0,
  };
  let enabled = true;
  let selectedChartScope: ChartScope = 'site';
  let chartScopeInitialized = false;
  let currentTabId: number | null = null;
  let currentSearchEngineName: string | null = null;
  let currentSiteBlocked = false;
  let currentSiteBlockIndex = -1;
  let currentSiteAvailable: boolean | null = null;
  let pageMarkerSummary = { ...EMPTY_PAGE_MARKER_SUMMARY };
  let unblockingCurrentSite = false;
  let pageMarkerBars: {
    key: ChartBarKey;
    label: string;
    count: number;
    height: number;
  }[] = [];
  let supportedEngineNames = '';

  $: {
    supportedEngineNames = BUILT_IN_ENGINES
      .map((engine) => getSearchEngineDisplayName(engine.hostname, engine.name))
      .join(' · ');
    const legacyCount = Math.max(
      0,
      todayCount
        - todayBreakdown.adCount
        - todayBreakdown.targetDomainCount
        - todayBreakdown.subdomainCount
        - todayBreakdown.urlCount
        - todayBreakdown.selectorCount,
    );
    const markerTypes = selectedChartScope === 'site'
      ? [
          { key: 'domain' as const, label: t('domainLabel'), count: pageMarkerSummary.domainCount },
          { key: 'url' as const, label: t('filterUrl'), count: pageMarkerSummary.urlCount },
          { key: 'ad' as const, label: t('adLabel'), count: pageMarkerSummary.adCount },
          { key: 'selector' as const, label: t('pageElementLabel'), count: pageMarkerSummary.selectorCount },
        ]
      : [
          {
            key: 'domain' as const,
            label: t('domainLabel'),
            count: todayBreakdown.targetDomainCount + todayBreakdown.subdomainCount,
          },
          { key: 'url' as const, label: t('filterUrl'), count: todayBreakdown.urlCount },
          { key: 'ad' as const, label: t('adLabel'), count: todayBreakdown.adCount },
          {
            key: 'selector' as const,
            label: t('pageElementLabel'),
            count: todayBreakdown.selectorCount,
          },
          ...(legacyCount > 0
            ? [{
                key: 'legacy' as const,
                label: t('legacyStatsLabel'),
                count: Math.max(todayBreakdown.otherCount, legacyCount),
              }]
            : []),
        ];
    const maxCount = Math.max(1, ...markerTypes.map((item) => item.count));
    pageMarkerBars = markerTypes.map((item) => ({
      ...item,
      height: item.count === 0
        ? 4
        : Math.max(18, Math.round((item.count / maxCount) * 100)),
    }));
  }

  async function loadData() {
    const tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    const storage = await get();
    if (storage.locale) {
      await initLocale(storage.locale);
    } else {
      await initLocale();
    }
    setDocumentLocale(getLocale());
    enabled = storage.enabled;
    const today = formatLocalDateKey(new Date());
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayCount = todayStat?.count ?? 0;
    todayBreakdown = {
      adCount: todayStat?.adCount ?? 0,
      targetDomainCount: todayStat?.targetDomainCount ?? 0,
      subdomainCount: todayStat?.subdomainCount ?? 0,
      urlCount: todayStat?.urlCount ?? 0,
      selectorCount: todayStat?.selectorCount ?? 0,
      otherCount: todayStat?.otherCount ?? 0,
    };
    currentTabId = tab?.id ?? null;
    const currentSearchEngine = tab?.url ? detectSearchEngine(tab.url) : null;
    currentSearchEngineName = currentSearchEngine
      ? getSearchEngineDisplayName(currentSearchEngine.hostname, currentSearchEngine.name)
      : null;
    if (!chartScopeInitialized) {
      selectedChartScope = currentSearchEngineName ? 'site' : 'today';
      chartScopeInitialized = true;
    }
    pageMarkerSummary = { ...EMPTY_PAGE_MARKER_SUMMARY };

    if (currentSearchEngineName && currentTabId !== null) {
      try {
        const response: unknown = await browser.tabs.sendMessage(currentTabId, {
          type: PAGE_MARKER_SUMMARY_REQUEST,
        });
        if (isPageMarkerSummary(response)) {
          pageMarkerSummary = response;
        }
      } catch {
        // 页面尚未注入 content script 时保持零命中状态。
      }
    }

    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteAvailable = domain !== null;
      currentSiteBlockIndex = domain
        ? findMatchingBlockedDomainIndex(domain, storage.urls, storage.blockSubdomains ?? true)
        : -1;
      currentSiteBlocked = currentSiteBlockIndex >= 0;
    } else {
      currentSiteAvailable = false;
      currentSiteBlocked = false;
      currentSiteBlockIndex = -1;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  async function unblockCurrentSite() {
    if (currentSiteBlockIndex < 0 || unblockingCurrentSite) return;
    unblockingCurrentSite = true;
    try {
      await removeBlockedItem('domain', currentSiteBlockIndex);
      currentSiteBlocked = false;
      currentSiteBlockIndex = -1;
    } finally {
      unblockingCurrentSite = false;
    }
  }

  function openOptions() {
    browser.tabs.create({ url: browser.runtime.getURL('options.html') });
  }

  function selectChartScope(scope: ChartScope): void {
    selectedChartScope = scope;
  }

  onMount(() => {
    const handlePageMarkerUpdate = (
      message: unknown,
      sender: Browser.runtime.MessageSender,
    ): void => {
      if (sender.tab?.id !== currentTabId || !isPageMarkerCountMessage(message)) return;
      pageMarkerSummary = {
        count: message.count,
        adCount: message.adCount ?? 0,
        domainCount: message.domainCount ?? 0,
        urlCount: message.urlCount ?? 0,
        selectorCount: message.selectorCount ?? 0,
      };
    };

    browser.runtime.onMessage.addListener(handlePageMarkerUpdate);
    void loadData();
    const unsubscribeStorage = subscribe(() => loadData());
    return () => {
      browser.runtime.onMessage.removeListener(handlePageMarkerUpdate);
      unsubscribeStorage();
    };
  });
</script>

<main class={enabled ? 'enabled' : 'disabled'}>
  <!-- ===== Header ===== -->
  <header>
    <div class="brand">
      <span class="brand-icon" aria-hidden="true">
        <img src="/icons/icon-32.png" alt="" />
      </span>
      <span class="brand-text">Hush</span>
    </div>
    <div class="header-actions">
      {#if currentSiteAvailable === false}
        <span
          class="header-unavailable"
          aria-label={t('siteUnavailable')}
          title={t('siteUnavailable')}
        >
          <span class="header-status-dot" aria-hidden="true"></span>
          {t('siteUnavailableShort')}
        </span>
      {/if}
      <label class="toggle" aria-label={enabled ? t('toggleDisable') : t('toggleEnable')}>
        <input type="checkbox" checked={enabled} onchange={toggleEnabled} />
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
      </label>
    </div>
  </header>

  <!-- ===== Stats ===== -->
  <div class="stats-grid">
    <button
      type="button"
      class="stat-card current-site-card"
      class:has-blocks={pageMarkerSummary.count > 0}
      class:unavailable={!currentSearchEngineName}
      class:selected={selectedChartScope === 'site'}
      aria-pressed={selectedChartScope === 'site'}
      aria-controls="srb-popup-chart"
      onclick={() => selectChartScope('site')}
    >
      <div class="site-card-heading">
        <span class="site-card-label">{t('currentSiteStatsLabel')}</span>
      </div>
      <div class="site-card-metric">
        <span class="site-stat-value">
          {currentSearchEngineName ? pageMarkerSummary.count : '—'}
        </span>
        {#if currentSearchEngineName}
          <span class="site-stat-unit">{t('currentPageItemsUnit')}</span>
        {/if}
      </div>
      <span class="site-card-meta">
        {currentSearchEngineName ?? t('searchPageOnlyShort')}
      </span>
    </button>
    <button
      type="button"
      class="stat-card today-card"
      class:selected={selectedChartScope === 'today'}
      aria-pressed={selectedChartScope === 'today'}
      aria-controls="srb-popup-chart"
      onclick={() => selectChartScope('today')}
    >
      <div class="site-card-heading">
        <span class="today-card-label">{t('todayLabel')}</span>
      </div>
      <div class="site-card-metric">
        <span class="site-stat-value stat-value">{todayCount}</span>
        <span class="site-stat-unit">{t('times')}</span>
      </div>
      <span class="site-card-meta">{t('searchPageOnlyShort')}</span>
    </button>
  </div>

  <!-- ===== Linked Bar Chart ===== -->
  <div id="srb-popup-chart" class="chart-section">
    <div class="chart-heading-row">
      <span class="chart-label">
        {selectedChartScope === 'site'
          ? t('currentSiteChartTitle')
          : t('todayChartTitle')}
      </span>
      <span class="chart-engine">
        {selectedChartScope === 'site'
          ? currentSearchEngineName ?? t('siteUnavailableShort')
          : t('todayLabel')}
      </span>
    </div>
    {#if selectedChartScope === 'site' && !currentSearchEngineName}
      <div
        class="chart-empty-state"
        class:blocked={currentSiteBlocked}
        role="status"
      >
        <div class="empty-state-content">
          <span class="empty-state-icon" aria-hidden="true">
            {#if currentSiteBlocked}
              <svg viewBox="0 0 24 24">
                <path d="M12 3 4.5 6v5.2c0 4.7 3.1 8.5 7.5 9.8 4.4-1.3 7.5-5.1 7.5-9.8V6L12 3Z"></path>
                <path d="M12 8v5"></path>
                <path d="M12 16.5h.01"></path>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24">
                <path d="M6.5 3.5h7l4 4v13h-11v-17Z"></path>
                <path d="M13.5 3.5v4h4"></path>
                <path d="m9.5 12 5 5"></path>
                <path d="m14.5 12-5 5"></path>
              </svg>
            {/if}
          </span>
          <div class="empty-state-title-row">
            <strong>
              {currentSiteBlocked ? t('siteBlocked') : t('searchEnginePageHint')}
            </strong>
            {#if currentSiteBlocked}
              <button
                class="unblock-site-btn"
                disabled={unblockingCurrentSite}
                onclick={unblockCurrentSite}
              >
                {t('unblockDomain')}
              </button>
            {/if}
          </div>
          <span class="supported-engines">
            {t('supportedSearchEngines', supportedEngineNames)}
          </span>
        </div>
      </div>
    {:else}
      <div
        class="site-bar-chart"
        style={`grid-template-columns: repeat(${pageMarkerBars.length}, minmax(0, 1fr))`}
        role="img"
        aria-label={selectedChartScope === 'site'
          ? t('currentSiteBarChartAria')
          : t('todayBarChartAria')}
      >
        {#each pageMarkerBars as item}
          <div
            class={`bar-column ${item.key}`}
            title={`${item.label}: ${item.count}`}
          >
            <span class="bar-value">{item.count}</span>
            <div class="bar-track">
              <span
                class={`bar-fill ${item.key}`}
                style={`height: ${item.height}%`}
              ></span>
            </div>
            <span class="bar-label">{item.label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ===== Footer ===== -->
  <footer>
    <button class="settings-btn" onclick={openOptions} aria-label={t('openSettings')}>
      <span>⚙️</span>
    </button>
    <span class="version">v{packageJson.version}</span>
  </footer>
</main>

<style>
  :global(body) {
    width: var(--srb-popup-width);
    margin: 0;
    padding: 0;
    font-family: var(--srb-font);
    font-size: var(--srb-font-size-body);
    overflow-x: hidden;
  }

  main {
    background: var(--srb-popup-bg);
    min-height: 100%;
    transition: opacity 0.2s;
  }
  main.disabled {
    opacity: 0.6;
  }

  /* ===== Header ===== */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--srb-surface);
    color: var(--srb-text-strong);
    border-bottom: 1px solid var(--srb-border-light);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .brand-icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-brand-soft);
  }
  .brand-icon img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .brand-text {
    font-weight: var(--srb-weight-semibold);
    font-size: 15px;
    letter-spacing: 0.01em;
  }
  .header-actions {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: flex-end;
    gap: var(--srb-space-sm);
  }
  .header-unavailable {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-control-hover-bg);
    color: var(--srb-text-muted);
    font-size: 11px;
    font-weight: var(--srb-weight-semibold);
    line-height: 1;
    white-space: nowrap;
  }
  .header-status-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: var(--srb-radius-full);
    background: var(--srb-text-muted);
  }

  /* ===== Toggle Switch ===== */
  .toggle {
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-track {
    position: relative;
    width: var(--srb-popup-toggle-width);
    height: var(--srb-popup-toggle-height);
    background: var(--srb-toggle-off);
    border-radius: var(--srb-radius-full);
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: var(--srb-accent-hover);
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: var(--srb-popup-toggle-thumb-size);
    height: var(--srb-popup-toggle-thumb-size);
    background: var(--srb-surface);
    border-radius: var(--srb-radius-full);
    transition: transform 0.2s;
    box-shadow: 0 0 0 1px rgba(41, 39, 38, 0.12), var(--srb-shadow-xs);
  }
  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
  }
  .toggle input:focus-visible + .toggle-track {
    outline: 2px solid var(--srb-accent-ring);
    outline-offset: 2px;
  }

  /* ===== Stats Grid ===== */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--srb-space-sm);
    padding: 12px 16px;
  }
  .stat-card {
    padding: 12px;
    border: 1px solid var(--srb-border-light);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    color: inherit;
    cursor: pointer;
    font: inherit;
    box-shadow: var(--srb-shadow-xs);
    transition:
      background var(--srb-transition-fast),
      border-color var(--srb-transition-fast),
      box-shadow var(--srb-transition-fast),
      transform var(--srb-transition-fast);
  }
  .stat-card:hover:not(:disabled) {
    border-color: var(--srb-border-muted);
    transform: translateY(-1px);
  }
  .stat-card:focus-visible {
    outline: 2px solid var(--srb-accent-ring);
    outline-offset: 2px;
  }
  .stat-card.selected {
    border-color: var(--srb-accent-border);
    background: var(--srb-accent-soft);
    box-shadow: 0 0 0 2px var(--srb-accent-highlight), var(--srb-shadow-sm);
  }
  .stat-card:disabled {
    cursor: default;
    opacity: 0.72;
  }
  .current-site-card {
    position: relative;
    min-width: 0;
    min-height: 90px;
    overflow: hidden;
    background: var(--srb-surface);
    text-align: left;
  }
  .current-site-card.has-blocks {
    background: var(--srb-surface);
  }
  .current-site-card.unavailable {
    background: var(--srb-control-hover-bg);
    border-color: var(--srb-border-light);
  }
  .current-site-card.selected,
  .current-site-card.has-blocks.selected {
    background: var(--srb-accent-soft);
    border-color: var(--srb-accent-border);
  }
  .site-card-heading {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-xs);
  }
  .site-card-label,
  .today-card-label {
    color: var(--srb-text-secondary);
    font-size: 10px;
    font-weight: var(--srb-weight-semibold);
    letter-spacing: var(--srb-tracking-caps);
  }
  .site-card-metric {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-top: 4px;
  }
  .site-stat-value {
    color: var(--srb-accent-hover);
    font-size: 29px;
    font-weight: var(--srb-weight-bold);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .current-site-card.unavailable .site-stat-value {
    color: var(--srb-text-muted);
  }
  .site-stat-unit {
    color: var(--srb-text-secondary);
    font-size: 10px;
    font-weight: var(--srb-weight-medium);
    white-space: nowrap;
  }
  .site-card-meta {
    position: relative;
    z-index: 1;
    display: inline-block;
    max-width: 100%;
    margin-top: 5px;
    overflow: hidden;
    color: var(--srb-text-secondary);
    font-size: 10px;
    font-weight: var(--srb-weight-medium);
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .today-card {
    position: relative;
    min-width: 0;
    min-height: 90px;
    overflow: hidden;
    text-align: left;
  }
  .stat-value {
    display: block;
    color: var(--srb-text-strong);
    font-size: 29px;
    font-weight: var(--srb-weight-bold);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  /* ===== Unsupported Page Chart State ===== */
  .chart-empty-state {
    display: flex;
    box-sizing: border-box;
    height: 112px;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-medium);
  }
  .empty-state-content {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    text-align: center;
  }
  .empty-state-icon {
    display: grid;
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid var(--srb-border-light);
    border-radius: 10px;
    background: var(--srb-control-hover-bg);
    color: var(--srb-text-muted);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  }
  .empty-state-icon svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }
  .empty-state-title-row {
    display: flex;
    max-width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .empty-state-title-row strong {
    min-width: 0;
    color: var(--srb-text-strong);
    font-size: 11px;
    font-weight: var(--srb-weight-semibold);
    line-height: 1.35;
  }
  .supported-engines {
    display: block;
    max-width: 238px;
    margin-top: 3px;
    color: var(--srb-text-muted);
    font-size: 9px;
    font-weight: var(--srb-weight-medium);
    line-height: 1.35;
    text-align: center;
  }
  .chart-empty-state.blocked {
    color: var(--srb-danger-strong);
  }
  .chart-empty-state.blocked .empty-state-icon {
    border-color: var(--srb-danger-border);
    background: var(--srb-danger-light);
    color: var(--srb-danger-strong);
  }
  .unblock-site-btn {
    flex: 0 0 auto;
    padding: 3px 8px;
    border: 1px solid var(--srb-danger-border);
    border-radius: var(--srb-radius-full);
    background: var(--srb-surface);
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    line-height: 1.2;
  }
  .unblock-site-btn:hover {
    background: var(--srb-danger-light);
  }
  .unblock-site-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  /* ===== Current Site Bar Chart ===== */
  .chart-section {
    margin: 0 16px 10px;
    padding: 12px;
    border: 1px solid var(--srb-border-light);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .chart-heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-sm);
    margin-bottom: 14px;
  }
  .chart-label {
    color: var(--srb-text-secondary);
    font-size: 11px;
    font-weight: var(--srb-weight-semibold);
    letter-spacing: var(--srb-tracking-caps);
  }
  .chart-engine {
    max-width: 96px;
    overflow: hidden;
    color: var(--srb-text-muted);
    font-size: 9px;
    font-weight: var(--srb-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .site-bar-chart {
    display: grid;
    height: 112px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    padding: 0 4px;
  }
  .bar-column {
    display: grid;
    min-width: 0;
    grid-template-rows: 16px 1fr 18px;
    gap: 4px;
    text-align: center;
  }
  .bar-value {
    color: var(--srb-text-secondary);
    font-size: 10px;
    font-weight: var(--srb-weight-semibold);
    font-variant-numeric: tabular-nums;
    line-height: 16px;
  }
  .bar-track {
    display: flex;
    min-height: 0;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    border-radius: var(--srb-radius-sm);
    background:
      linear-gradient(to top, rgba(116, 123, 139, 0.08) 1px, transparent 1px);
    background-size: 100% 25%;
    border-bottom: 1px solid var(--srb-border-muted);
  }
  .bar-fill {
    display: block;
    width: 22px;
    min-height: 3px;
    border-radius: 6px 6px 2px 2px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34);
    transition: height var(--srb-transition-slow);
  }
  .bar-fill.domain {
    background: linear-gradient(180deg, #60a5fa, var(--srb-chart-blue));
  }
  .bar-fill.url {
    background: linear-gradient(180deg, #c084fc, var(--srb-chart-purple));
  }
  .bar-fill.ad {
    background: linear-gradient(180deg, #fb923c, var(--srb-chart-orange));
  }
  .bar-fill.selector {
    background: linear-gradient(180deg, #f472b6, var(--srb-chart-pink));
  }
  .bar-fill.legacy {
    background: linear-gradient(180deg, #a1a1aa, #71717a);
  }
  .bar-label {
    overflow: hidden;
    color: var(--srb-text-secondary);
    font-size: 10px;
    font-weight: var(--srb-weight-medium);
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (prefers-reduced-motion: reduce) {
    .stat-card,
    .bar-fill {
      transition: none;
    }
  }

  /* ===== Footer ===== */
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 12px;
    border-top: 1px solid var(--srb-border-light);
  }
  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--srb-border-light);
    border-radius: var(--srb-radius-full);
    background: var(--srb-surface);
    color: var(--srb-text-secondary);
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.12s;
    box-shadow: var(--srb-shadow-xs);
  }
  .settings-btn:hover {
    background: var(--srb-control-hover-bg);
    border-color: var(--srb-border-muted);
    color: var(--srb-text-neutral);
  }
  .version {
    font-size: 11px;
    color: var(--srb-text-muted);
  }
</style>
