<script lang="ts">
  import {
    get,
    getAllBlocked,
    removeBlockedItem,
    addCustomEngine,
    removeCustomEngine,
    subscribe,
    addDomain,
    addBlockedUrl,
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

  $: filteredItems = filter === 'all' ? blockedItems : blockedItems.filter((i) => i.type === filter);

  // 自定义引擎表单
  let newEngineName = '';
  let newEngineHostname = '';
  let newEngineContainer = '';
  let newEngineItem = '';
  let newEngineLink = '';

  async function loadData() {
    blockedItems = await getAllBlocked();
    const storage = await get();
    customEngines = storage.customEngines ?? [];
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;
    errorMsg = '';

    try {
      if (
        value.startsWith('http') &&
        new URL(value).pathname !== '/'
      ) {
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
      errorMsg = '请输入有效的域名或 URL';
    }
  }

  async function handleRemove(item: { type: 'domain' | 'url' | 'selector'; index: number }) {
    await removeBlockedItem(item.type, item.index);
    await loadData();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  async function handleAddEngine() {
    if (!newEngineName || !newEngineHostname || !newEngineContainer || !newEngineItem) {
      errorMsg = '请填写所有必填字段';
      return;
    }
    const config: SearchEngineConfig = {
      name: newEngineName,
      hostname: newEngineHostname.replace(/^www\./, ''),
      containerSelector: newEngineContainer,
      itemSelector: newEngineItem,
      linkSelector: newEngineLink || 'a[href]',
    };
    await addCustomEngine(config);
    newEngineName = newEngineHostname = newEngineContainer = newEngineItem = newEngineLink = '';
    errorMsg = '';
    await loadData();
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
  <h1>屏蔽域名/链接 管理</h1>
  <div class="input-row">
    <input
      type="text"
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder="输入域名或完整 URL，如 example.com 或 https://..."
    />
    <button onclick={handleAdd}>添加</button>
  </div>
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {/if}

  <div class="filter-bar">
    <button class:active={filter === 'all'} onclick={() => filter = 'all'}>全部</button>
    <button class:active={filter === 'domain'} onclick={() => filter = 'domain'}>🌐 域名</button>
    <button class:active={filter === 'url'} onclick={() => filter = 'url'}>🔗 链接</button>
    <button class:active={filter === 'selector'} onclick={() => filter = 'selector'}>✂️ 选择器</button>
  </div>

  {#if filteredItems.length === 0}
    <p class="empty">暂无{filter === 'all' ? '' : '此类'}屏蔽内容</p>
  {:else}
    <ol>
      {#each filteredItems as item}
        <li>
          <span class="badge-type">{item.type === 'domain' ? '🌐' : item.type === 'url' ? '🔗' : '✂️'}</span>
          <span class="value">{item.value}</span>
          <button class="remove" onclick={() => handleRemove(item)}>删除</button>
        </li>
      {/each}
    </ol>
  {/if}

  <hr />

  <h2>已配置的搜索引擎</h2>
  {#each BUILT_IN_ENGINES as engine}
    <div class="engine-row">
      <span class="engine-name">{engine.name}</span>
      <span class="engine-host">({engine.hostname})</span>
      <span class="builtin-tag">内置</span>
    </div>
  {/each}
  {#each customEngines as engine, i}
    <div class="engine-row">
      <span class="engine-name">{engine.name}</span>
      <span class="engine-host">({engine.hostname})</span>
      <button class="remove" onclick={() => handleRemoveEngine(i)}>删除</button>
    </div>
  {/each}

  <details>
    <summary>手动添加搜索引擎</summary>
    <div class="engine-form">
      <input bind:value={newEngineName} placeholder="名称（如 我的搜索）" />
      <input bind:value={newEngineHostname} placeholder="hostname（如 search.example.com）" />
      <input bind:value={newEngineContainer} placeholder="容器选择器（如 #search）" />
      <input bind:value={newEngineItem} placeholder="结果选择器（如 .result-item）" />
      <input bind:value={newEngineLink} placeholder="链接选择器（默认 a[href]）" />
      <button onclick={handleAddEngine}>添加</button>
    </div>
  </details>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
  }
  h1 { font-size: 18px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin: 20px 0 10px; }
  .input-row { display: flex; gap: 8px; margin-bottom: 8px; }
  input { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; }
  button {
    padding: 6px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
  }
  button:hover { background: #f0f0f0; }
  .error { color: #c00; font-size: 12px; }
  .empty { color: #999; font-style: italic; }
  .filter-bar { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .filter-bar button.active { background: #007bff; color: #fff; border-color: #007bff; }
  .filter-bar button.active:hover { background: #0056b3; }
  ol { padding-left: 0; list-style: none; }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    padding: 6px 8px;
    background: #f9f9f9;
    border-radius: 4px;
  }
  .badge-type { font-size: 14px; }
  .value { flex: 1; word-break: break-all; }
  .remove { color: #c00; border-color: #c00; padding: 2px 10px; }
  .remove:hover { background: #fff0f0; }
  .engine-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
  }
  .engine-name { font-weight: 500; }
  .engine-host { color: #666; font-size: 12px; }
  .builtin-tag {
    font-size: 11px;
    color: #999;
    background: #eee;
    padding: 1px 6px;
    border-radius: 3px;
  }
  .engine-form { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
  details { margin-top: 12px; }
  summary { cursor: pointer; color: #007bff; font-size: 13px; }
</style>
