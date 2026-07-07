<script lang="ts">
  import {
    getAllBlocked,
    removeBlockedItem,
    addCustomEngine,
    removeCustomEngine,
    addDomain,
    addBlockedUrl,
    get,
    subscribe,
  } from '../../utils/storage';
  import {
    BUILT_IN_ENGINES,
    type SearchEngineConfig,
  } from '../../utils/search-engines';
  import { onMount } from 'svelte';

  let blockedItems: { type: 'domain' | 'url' | 'selector'; value: string; index: number }[] = [];
  let filter: 'all' | 'domain' | 'url' | 'selector' = 'all';
  let inputValue = '';
  let errorMsg = '';
  let customEngines: SearchEngineConfig[] = [];
  let totalBlockCount = 0;
  let blockAds = false;

  $: filteredItems = filter === 'all' ? blockedItems : blockedItems.filter((i) => i.type === filter);

  let enginesOpen = false;
  function toggleEngines() { enginesOpen = !enginesOpen; }
async function toggleAdBlock() {
    blockAds = !blockAds;
    await setBlockAds(blockAds);
  }

  async function loadData() {
    const storage = await get();
    blockedItems = await getAllBlocked();
    customEngines = storage.customEngines ?? [];
    totalBlockCount = storage.blockCount;
    blockAds = storage.blockAds ?? false;
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;
    errorMsg = '';
    try {
      if (value.startsWith('http') && new URL(value).pathname !== '/') {
        await addBlockedUrl(value);
      } else {
        const domain = value.startsWith('http')
          ? new URL(value).hostname.replace(/^www\./, '')
          : value.replace(/^www\./, '');
        new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        await addDomain(domain);
      }
      inputValue = '';
      await loadData();
    } catch {
      errorMsg = '请输入有效的域名或完整 URL';
    }
  }

  async function handleRemove(item: { type: 'domain' | 'url' | 'selector'; index: number }) {
    await removeBlockedItem(item.type, item.index);
    await loadData();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  async function handleRemoveEngine(index: number) {
    await removeCustomEngine(index);
    await loadData();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <!-- Header - Full width -->
  <header>
    <div class="header-content">
      <span class="header-icon">🛡</span>
      <span class="header-title">屏蔽管理</span>
      <span class="header-meta">共 {totalBlockCount} 次拦截</span>
    </div>
  </header>

  <!-- Add bar -->
  <section class="section">
    <div class="section-inner">
      <div class="add-row">
        <input
          type="text"
          bind:value={inputValue}
          onkeydown={handleKeydown}
          placeholder="域名或 URL，如 example.com"
        />
        <button onclick={handleAdd}>添加</button>
      </div>
      {#if errorMsg}
        <p class="err">{errorMsg}</p>
      {/if}
    </div>
  </section>

  <!-- Tabs + Table -->
  <section class="section">
    <div class="section-inner">
      <div class="tabs">
        <button class:active={filter === 'all'} onclick={() => filter = 'all'}>全部</button>
        <button class:active={filter === 'domain'} onclick={() => filter = 'domain'}>域名</button>
        <button class:active={filter === 'url'} onclick={() => filter = 'url'}>链接</button>
        <button class:active={filter === 'selector'} onclick={() => filter = 'selector'}>选择器</button>
      </div>

      {#if filteredItems.length === 0}
        <div class="empty">
          <p>暂无{filter === 'all' ? '' : '此类'}屏蔽内容</p>
        </div>
      {:else}
        <table>
          <thead>
            <tr>
              <th class="col-type">类型</th>
              <th class="col-val">值</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredItems as item}
              <tr>
                <td class="col-type">
                  <span class="type-badge" class:domain={item.type === 'domain'} class:url={item.type === 'url'} class:selector={item.type === 'selector'}>
                    {item.type === 'domain' ? '🌐 域名' : item.type === 'url' ? '🔗 链接' : '✂️ 选择器'}
                  </span>
                </td>
                <td class="col-val"><code>{item.value}</code></td>
                <td class="col-del">
                  <button class="del" onclick={() => handleRemove(item)} aria-label="删除">✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </section>

  <!-- Engines -->
  <!-- Ad Block -->
  <section class="section">
    <div class="section-inner">
      <div class="ad-toggle">
        <span>📢 广告屏蔽</span>
        <label class="toggle" aria-label="切换广告屏蔽">
          <input type="checkbox" checked={blockAds} onchange={toggleAdBlock} />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      </div>
      <p class="ad-hint">开启后自动标记搜索结果中的广告链接</p>
    </div>
  </section>

  <section class="section">
    <div class="section-inner">
      <div class="engines-header" onclick={toggleEngines} onkeydown={(e) => e.key === 'Enter' && toggleEngines()}
        tabindex="0" role="button" aria-expanded={enginesOpen}>
        <span>🔧 搜索引擎 <span class="cnt">{BUILT_IN_ENGINES.length + customEngines.length}</span></span>
        <span class="chev">{enginesOpen ? '▲' : '▼'}</span>
      </div>

      {#if enginesOpen}
        <div class="engines-body">
          {#each BUILT_IN_ENGINES as engine}
            <div class="eg-row">
              <span class="eg-n">{engine.name}</span>
              <code class="eg-h">{engine.hostname}</code>
              <span class="eg-tag">内置</span>
            </div>
          {/each}
          {#each customEngines as engine, i}
            <div class="eg-row">
              <span class="eg-n">{engine.name}</span>
              <code class="eg-h">{engine.hostname}</code>
              <button class="del" onclick={() => handleRemoveEngine(i)}>✕</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    background: #fff;
    color: #1D1D1F;
    -webkit-font-smoothing: antialiased;
  }

  /* Header - full width green bar */
  header {
    background: linear-gradient(135deg, #059669, #047857);
    color: #fff;
    padding: 20px 24px;
  }
  .header-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header-icon { font-size: 24px; }
  .header-title { font-size: 18px; font-weight: 700; }
  .header-meta { font-size: 13px; opacity: 0.7; margin-left: auto; }

  /* Section - flush, no card */
  .section {
    border-bottom: 1px solid #E5E7EB;
  }
  .section:last-child { border-bottom: none; }
  .section-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px 24px;
  }

  /* Add */
  .add-row {
    display: flex;
    gap: 8px;
  }
  .add-row input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  .add-row input:focus { border-color: #059669; }
  .add-row button {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: #059669;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
  }
  .add-row button:hover { background: #047857; }

  .err { color: #DC2626; font-size: 12px; margin: 8px 0 0; }

  /* Tabs */
  .tabs { display: flex; gap: 2px; margin-bottom: 16px; }
  .tabs button {
    padding: 8px 18px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    color: #6B7280;
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.12s;
  }
  .tabs button:hover { background: #F3F4F6; color: #1D1D1F; }
  .tabs button.active { background: #059669; color: #fff; }

  /* Empty */
  .empty { text-align: center; padding: 40px 16px; color: #9CA3AF; font-size: 14px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 8px 12px;
    border-bottom: 1px solid #E5E7EB;
  }
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #F9FAFB; }

  .col-type { width: 110px; }
  .col-val { }
  .col-del { width: 40px; text-align: center; }

  .type-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .type-badge.domain { background: #ECFDF5; color: #059669; }
  .type-badge.url { background: #EFF6FF; color: #2563EB; }
  .type-badge.selector { background: #F0FDF4; color: #16A34A; }

  td code {
    font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
    font-size: 12px;
    color: #374151;
    word-break: break-all;
  }

  .del {
    width: 28px; height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #9CA3AF;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.12s;
  }
  .del:hover { background: #FEF2F2; color: #DC2626; }

  /* Engines */
  .engines-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    user-select: none;
    padding: 4px 0;
    transition: background 0.1s;
  }
  .engines-header:hover { color: #059669; }
  .cnt {
    font-size: 11px;
    background: #E5E7EB;
    color: #6B7280;
    padding: 1px 7px;
    border-radius: 999px;
    margin-left: 4px;
    font-weight: 600;
  }
  .chev { font-size: 10px; color: #9CA3AF; }

  .engines-body {
    margin-top: 12px;
    border-top: 1px solid #F3F4F6;
    padding-top: 12px;
  }
  .eg-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .eg-row + .eg-row { border-top: 1px solid #F9FAFB; }
  .eg-n { font-weight: 600; font-size: 13px; min-width: 80px; }
  .eg-h {
    font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
    font-size: 12px;
    color: #6B7280;
  }
  .eg-tag {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    background: #F3F4F6;
    color: #6B7280;
  }

  .ad-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 500;
    padding: 2px 0;
  }
  .ad-hint {
    font-size: 12px;
    color: #9CA3AF;
    margin: 6px 0 0;
  }
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
    background: #D1D5DB;
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
</style>
