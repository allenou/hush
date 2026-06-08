<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { BUILT_IN_ENGINES } from '../../utils/search-engines';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let blockCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let showTeaching = false;
  let teachingStep: 'idle' | 'clicking' | 'done' = 'idle';
  let teachingError = '';
  let stats: { date: string; count: number }[] = [];

  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function loadData() {
    const tab = await getCurrentTab();
    const storage = await get();
    urls = storage.urls;
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    stats = (storage.stats ?? []).slice(-7);
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteBlocked = domain ? urls.includes(domain) : false;
      // 检查当前页是否已知搜索引擎
      const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
      const known = [...BUILT_IN_ENGINES, ...(storage.customEngines ?? [])].some(
        (e) => e.hostname === hostname,
      );
      showTeaching = !known;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.runtime.openOptionsPage?.();
  }

  async function startTeaching() {
    const tab = await getCurrentTab();
    if (!tab?.id) return;
    teachingStep = 'clicking';
    teachingError = '';

    const listener = (msg: any) => {
      if (msg.type === 'srb-teaching-result') {
        if (msg.success) {
          // 自动保存，用 hostname 作为名称
          const config = msg.config;
          config.name = msg.hostname;
          chrome.storage.local.get('blocker').then(async (result) => {
            const data = result.blocker || {};
            const engines = data.customEngines ?? [];
            const existing = engines.findIndex(
              (e: any) => e.hostname === config.hostname,
            );
            if (existing >= 0) {
              engines[existing] = config;
            } else {
              engines.push(config);
            }
            await chrome.storage.local.set({
              blocker: { ...data, customEngines: engines },
            });
            teachingStep = 'done';
          });
        } else {
          teachingError = msg.error || '识别失败';
          teachingStep = 'idle';
        }
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'srb-start-teaching' });
    } catch {
      teachingError = '无法与此页面通信';
      teachingStep = 'idle';
      chrome.runtime.onMessage.removeListener(listener);
    }
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

  {#if showTeaching && teachingStep === 'idle'}
    <section class="teaching">
      <span>此搜索引擎还不认识</span>
      <button class="btn-teach" onclick={startTeaching}>教我识别</button>
    </section>
  {/if}

  {#if teachingStep === 'clicking'}
    <section style="color: #28a745;">在页面上移动鼠标，点击搜索结果完成标记</section>
  {/if}

  {#if teachingError}
    <section style="color: #c00; font-size: 12px;">{teachingError}</section>
  {/if}

  {#if teachingStep === 'done'}
    <section style="color: #28a745;">✅ 已学会！刷新页面后生效</section>
  {/if}

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

  <button onclick={openOptions}>设置</button>
</main>

<style>
  :global(body) {
    width: 300px; margin: 0; padding: 12px;
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
  .teaching { display: flex; align-items: center; gap: 8px; }
  .btn-teach { background: #007bff; color: #fff; border-color: #007bff; }
  .btn-teach:hover { background: #0056b3; }
  .stats { margin-top: 4px; }
  .stats h3 { font-size: 12px; margin: 0 0 6px; color: #666; }
  .chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
  .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .bar { width: 100%; background: #c00; border-radius: 2px 2px 0 0; min-height: 2px; }
  .label { font-size: 9px; color: #999; margin-top: 2px; }
</style>
