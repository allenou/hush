<script lang="ts">
  import { get, addDomain, removeDomain, subscribe } from '../../utils/storage';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let inputValue = '';
  let errorMsg = '';

  function isValidDomain(value: string): boolean {
    try {
      const url = value.startsWith('http') ? value : `https://${value}`;
      const parsed = new URL(url);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }

  async function loadData() {
    const storage = await get();
    urls = storage.urls;
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;
    // 提取域名
    const domain = value.startsWith('http')
      ? new URL(value).hostname.replace(/^www\./, '')
      : value.replace(/^www\./, '');
    if (!isValidDomain(domain)) {
      errorMsg = '请输入有效的域名';
      return;
    }
    errorMsg = '';
    await addDomain(domain);
    inputValue = '';
    await loadData();
  }

  async function handleRemove(index: number) {
    await removeDomain(index);
    await loadData();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <h1>屏蔽域名管理</h1>
  <div class="input-row">
    <input
      type="text"
      id="input"
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder="输入域名，如 example.com"
    />
    <button onclick={handleAdd}>添加域名</button>
  </div>
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {/if}
  {#if urls.length === 0}
    <p class="empty">暂无屏蔽域名</p>
  {:else}
    <ol>
      {#each urls as url, i}
        <li>
          <span>{url}</span>
          <button class="remove" onclick={() => handleRemove(i)}>删除</button>
        </li>
      {/each}
    </ol>
  {/if}
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 20px;
    max-width: 500px;
    margin: 0 auto;
  }
  h1 { font-size: 18px; margin-bottom: 16px; }
  .input-row { display: flex; gap: 8px; margin-bottom: 8px; }
  input {
    flex: 1; padding: 6px 10px;
    border: 1px solid #ccc; border-radius: 4px;
  }
  button {
    padding: 6px 16px;
    border: 1px solid #ccc; border-radius: 4px;
    background: #fff; cursor: pointer;
  }
  button:hover { background: #f0f0f0; }
  .error { color: #c00; font-size: 12px; margin-bottom: 8px; }
  .empty { color: #999; font-style: italic; }
  ol { padding-left: 24px; }
  li { margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .remove { color: #c00; border-color: #c00; }
  .remove:hover { background: #fff0f0; }
</style>
