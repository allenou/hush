<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let blockCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;

  function getCurrentTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
  }

  async function loadData() {
    const tab = await getCurrentTab();
    const storage = await get();
    urls = storage.urls;
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteBlocked = domain ? urls.includes(domain) : false;
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
</main>

<style>
  :global(body) {
    width: 280px;
    margin: 0;
    padding: 12px;
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
</style>
