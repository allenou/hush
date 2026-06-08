<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { onMount } from 'svelte';

  let blockCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let stats: { date: string; count: number }[] = [];

  async function loadData() {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    const storage = await get();
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    stats = (storage.stats ?? []).slice(-7);
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteBlocked = domain ? storage.urls.includes(domain) : false;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.runtime.openOptionsPage?.();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <section>
    <label>
      <input type="checkbox" checked={enabled} onclick={toggleEnabled} />
      启用
    </label>
  </section>
  <section>拦截总数：{blockCount}</section>

  {#if currentSiteBlocked}
    <section style="color: #c00;">当前网站已被屏蔽</section>
  {/if}

  <button onclick={openOptions}>设置</button>

  {#if stats.length > 0}
    <section class="stats">
      <h3>拦截趋势（近 7 天）</h3>
      <div class="chart">
        {#each stats as day}
          <div class="bar-wrapper" title="{day.date}: {day.count} 次">
            <div class="bar" style="height: {Math.max(day.count * 4, 2)}px;"></div>
            <span class="label">
              {new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}
            </span>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    width: 280px; margin: 0; padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  }
  main { display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  button {
    margin-top: 4px; padding: 6px 16px;
    border: 1px solid #ccc; border-radius: 4px;
    background: #fff; cursor: pointer;
  }
  button:hover { background: #f5f5f5; }
  .stats { margin-top: 4px; }
  .stats h3 { font-size: 12px; margin: 0 0 6px; color: #666; }
  .chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
  .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .bar { width: 100%; background: #c00; border-radius: 2px 2px 0 0; min-height: 2px; }
  .label { font-size: 9px; color: #999; margin-top: 2px; }
</style>
