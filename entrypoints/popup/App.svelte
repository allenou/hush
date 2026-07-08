<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { onMount } from 'svelte';

  let blockCount = 0;
  let todayCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let stats: { date: string; count: number }[] = [];

  async function loadData() {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    const storage = await get();
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
    return d.toLocaleDateString('zh-CN', { weekday: 'short' });
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
    <label class="toggle" aria-label="{enabled ? '禁用' : '启用'}标记">
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
      <span class="stat-label">全部拦截</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{todayCount}</span>
      <span class="stat-label">今日</span>
    </div>
  </div>

  <!-- ===== Site Status ===== -->
  <div class="site-status" class:blocked={currentSiteBlocked}>
    {#if currentSiteBlocked}
      <span class="status-icon">🔴</span>
      <span>当前网站已被标记</span>
    {:else}
      <span class="status-icon">🟢</span>
      <span>当前网站正常</span>
    {/if}
  </div>

  <!-- ===== Chart (7-day) ===== -->
  {#if stats.length > 0}
    <div class="chart-section">
      <span class="chart-label">近 7 天趋势</span>
      <div class="chart">
        {#each stats as day}
          <div class="bar-wrapper" title="{day.date}: {day.count} 次">
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
    <button class="settings-btn" onclick={openOptions} aria-label="打开设置">
      <span>⚙️</span>
    </button>
    <span class="version">v1.0</span>
  </footer>
</main>

<style>
  :global(body) {
    width: 290px;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    overflow-x: hidden;
  }

  main {
    background: #F8F8FA;
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
    background: #0a5532;
    color: #fff;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .brand-icon {
    font-size: 20px;
  }
  .brand-text {
    font-weight: 600;
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
    width: 38px;
    height: 22px;
    background: rgba(0,0,0,0.18);
    border-radius: 9999px;
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: #059669;
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
  }
  .toggle input:focus-visible + .toggle-track {
    outline: 2px solid #6EE7B7;
    outline-offset: 2px;
  }

  /* ===== Stats Grid ===== */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 12px 16px;
  }
  .stat-card {
    background: #fff;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid #E5E7EB;
  }
  .stat-value {
    display: block;
    font-size: 26px;
    font-weight: 700;
    color: #1A1A2E;
    line-height: 1.2;
  }
  .stat-label {
    display: block;
    font-size: 11px;
    color: #6B7280;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ===== Site Status ===== */
  .site-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 16px 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: #F0FDF4;
    color: #166534;
    font-size: 12px;
    font-weight: 500;
  }
  .site-status.blocked {
    background: #FEF2F2;
    color: #991B1B;
  }
  .status-icon {
    font-size: 8px;
  }

  /* ===== Chart ===== */
  .chart-section {
    margin: 0 16px 10px;
    padding: 12px;
    background: #fff;
    border-radius: 10px;
    border: 1px solid #E5E7EB;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .chart-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.04em;
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
    background: linear-gradient(180deg, #059669, #6EE7B7);
    border-radius: 3px 3px 1px 1px;
    min-height: 2px;
    transition: height 0.3s ease;
  }
  .bar.zero {
    background: #E5E7EB;
  }
  .bar-label {
    font-size: 9px;
    color: #9CA3AF;
    margin-top: 4px;
    font-weight: 500;
  }

  /* ===== Footer ===== */
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 12px;
    border-top: 1px solid #E5E7EB;
  }
  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #E5E7EB;
    border-radius: 50%;
    background: #fff;
    color: #6B7280;
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.12s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .settings-btn:hover {
    background: #F3F4F6;
    border-color: #D1D5DB;
    color: #374151;
  }
  .version {
    font-size: 11px;
    color: #9CA3AF;
  }
</style>
