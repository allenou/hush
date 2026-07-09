<script lang="ts">
  import { get, setEnabled, subscribe } from '@/utils/storage';
  import { extractDomain } from '@/utils/domain';
  import { t, getLocale, initLocale } from '@/utils/locale-store.svelte';
  import { onMount } from 'svelte';

  let blockCount = 0;
  let todayCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let stats: { date: string; count: number }[] = [];

  async function loadData() {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    const storage = await get();
    if (storage.locale) {
      await initLocale(storage.locale);
    } else {
      await initLocale();
    }
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    stats = buildWeekStats(storage.stats ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayCount = todayStat?.count ?? 0;
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteBlocked = domain ? storage.urls.includes(domain) : false;
    }
  }

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

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(getLocale(), { weekday: 'short' });
  }

  $: maxCount = Math.max(...stats.map(s => s.count), 1);

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main class={enabled ? 'enabled' : 'disabled'}>
  <!-- ===== Header ===== -->
  <header>
    <div class="brand">
      <span class="brand-icon">🛡</span>
      <span class="brand-text">SearchKit</span>
    </div>
    <label class="toggle" aria-label={enabled ? t('toggleDisable') : t('toggleEnable')}>
      <input type="checkbox" checked={enabled} onchange={toggleEnabled} />
      <span class="toggle-track">
        <span class="toggle-thumb"></span>
      </span>
    </label>
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
  <div class="site-status" class:blocked={currentSiteBlocked}>
    {#if currentSiteBlocked}
      <span class="status-icon">🔴</span>
      <span>{t('siteBlocked')}</span>
    {:else}
      <span class="status-icon">🟢</span>
      <span>{t('siteNormal')}</span>
    {/if}
  </div>

  <!-- ===== Chart (7-day) ===== -->
  {#if stats.length > 0}
    <div class="chart-section">
      <span class="chart-label">{t('weeklyTrend')}</span>
      <div class="chart">
        {#each stats as day}
          <div class="bar-wrapper" title="{day.date}: {day.count} {t('times')}">
            <div
              class="bar"
              style="height: {Math.max((day.count / maxCount) * 48, 2)}px;"
              class:zero={day.count === 0}
            ></div>
            <span class="bar-label">{dayLabel(day.date)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ===== Footer ===== -->
  <footer>
    <button class="settings-btn" onclick={openOptions} aria-label={t('openSettings')}>
      <span>⚙️</span>
    </button>
    <span class="version">v1.0</span>
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
    background: var(--srb-primary);
    color: var(--srb-on-primary);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .brand-icon {
    font-size: var(--srb-space-xl);
  }
  .brand-text {
    font-weight: var(--srb-weight-semibold);
    font-size: 15px;
    letter-spacing: 0.01em;
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
    background: var(--srb-overlay-soft);
    border-radius: var(--srb-radius-full);
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: var(--srb-accent);
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
    box-shadow: var(--srb-shadow-xs);
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
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 56px;
  }
  .bar-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .bar {
    width: 100%;
    background: var(--srb-chart-gradient);
    border-radius: 3px 3px 1px 1px;
    min-height: 2px;
    transition: height 0.3s ease;
  }
  .bar.zero {
    background: var(--srb-border-light);
  }
  .bar-label {
    font-size: 9px;
    color: var(--srb-text-muted);
    margin-top: 4px;
    font-weight: 500;
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
