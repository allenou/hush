<script lang="ts">
  import ChartCanvas from '@/components/ChartCanvas.svelte';
  import { get, setEnabled, subscribe } from '@/utils/storage';
  import { extractDomain, matchesBlockedDomain } from '@/utils/domain';
  import { t, initLocale } from '@/utils/locale-store.svelte';
  import { formatDate, getLocale, setDocumentLocale } from '@/utils/locale';
  import { buildDailySeries, formatLocalDateKey } from '@/utils/statistics';
  import { onMount } from 'svelte';
  import type { ChartConfiguration } from 'chart.js';
  import packageJson from '../../../package.json';

  let blockCount = 0;
  let todayCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let currentSiteAvailable: boolean | null = null;
  let stats = buildDailySeries([], 7);

  async function loadData() {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    const storage = await get();
    if (storage.locale) {
      await initLocale(storage.locale);
    } else {
      await initLocale();
    }
    setDocumentLocale(getLocale());
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    stats = buildDailySeries(storage.stats ?? [], 7);
    const today = formatLocalDateKey(new Date());
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayCount = todayStat?.count ?? 0;
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteAvailable = domain !== null;
      currentSiteBlocked = domain
        ? matchesBlockedDomain(domain, storage.urls, storage.blockSubdomains ?? true)
        : false;
    } else {
      currentSiteAvailable = false;
      currentSiteBlocked = false;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  function dateLabel(dateStr: string): string {
    return formatDate(new Date(`${dateStr}T00:00:00`), { weekday: 'short' });
  }

  function chartColor(property: string, fallback: string): string {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
      return fallback;
    }

    try {
      return getComputedStyle(document.documentElement).getPropertyValue(property).trim() || fallback;
    } catch {
      return fallback;
    }
  }

  let trendConfiguration: ChartConfiguration<'line'>;
  $: trendConfiguration = {
    type: 'line',
    data: {
      labels: stats.map((item) => dateLabel(item.date)),
      datasets: [{
        label: t('weeklyTrend'),
        data: stats.map((item) => item.count),
        borderColor: chartColor('--srb-chart-blue', '#3b82f6'),
        backgroundColor: chartColor('--srb-chart-fill', 'rgba(59, 130, 246, 0.12)'),
        borderWidth: 2,
        fill: true,
        pointBackgroundColor: chartColor('--srb-chart-blue', '#3b82f6'),
        pointBorderColor: chartColor('--srb-surface', '#ffffff'),
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0.34,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          padding: 8,
          callbacks: {
            label: (context) => `${context.parsed.y ?? 0} ${t('times')}`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            autoSkip: false,
            color: chartColor('--srb-text-muted', '#6b6f84'),
            font: { size: 9, weight: 500 },
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          display: false,
          suggestedMax: 1,
        },
      },
    },
  };

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
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
    <div class="stat-card">
      <span class="stat-value">{blockCount}</span>
      <span class="stat-label">{t('totalBlockedLabel')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{todayCount}</span>
      <span class="stat-label">{t('todayLabel')}</span>
    </div>
  </div>

  <!-- ===== Site Status ===== -->
  {#if currentSiteAvailable === true}
    <div class="site-status" class:blocked={currentSiteBlocked}>
      {#if currentSiteBlocked}
        <span class="status-icon">🔴</span>
        <span>{t('siteBlocked')}</span>
      {:else}
        <span class="status-icon">🟢</span>
        <span>{t('siteNormal')}</span>
      {/if}
    </div>
  {/if}

  <!-- ===== Chart (7-day) ===== -->
  <div class="chart-section">
    <span class="chart-label">{t('weeklyTrend')}</span>
    <div class="chart">
      <ChartCanvas
        ariaLabel={t('popupTrendAria')}
        configuration={trendConfiguration}
      />
    </div>
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
    background: var(--srb-surface);
    border-radius: var(--srb-radius-lg);
    padding: 12px;
    text-align: center;
    box-shadow: var(--srb-shadow-xs);
    border: 1px solid var(--srb-border-light);
  }
  .stat-value {
    display: block;
    font-size: var(--srb-font-size-stat);
    font-weight: var(--srb-weight-bold);
    color: var(--srb-text-strong);
    line-height: var(--srb-line-height-tight);
  }
  .stat-label {
    display: block;
    font-size: 11px;
    color: var(--srb-text-secondary);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: var(--srb-tracking-caps);
  }

  /* ===== Site Status ===== */
  .site-status {
    display: flex;
    align-items: center;
    gap: var(--srb-space-xs);
    margin: 0 16px 10px;
    padding: 8px 12px;
    border-radius: var(--srb-radius-md);
    background: var(--srb-success-light);
    color: var(--srb-success-text);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-medium);
  }
  .site-status.blocked {
    background: var(--srb-danger-light);
    color: var(--srb-danger-strong);
  }
  .status-icon {
    font-size: 8px;
  }

  /* ===== Chart ===== */
  .chart-section {
    margin: 0 16px 10px;
    padding: 12px;
    background: var(--srb-surface);
    border-radius: var(--srb-radius-lg);
    border: 1px solid var(--srb-border-light);
    box-shadow: var(--srb-shadow-xs);
  }
  .chart-label {
    display: block;
    font-size: 11px;
    font-weight: var(--srb-weight-semibold);
    color: var(--srb-text-secondary);
    text-transform: uppercase;
    letter-spacing: var(--srb-tracking-caps);
    margin-bottom: 10px;
  }
  .chart {
    position: relative;
    height: 92px;
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
