<script lang="ts">
  import { onMount } from 'svelte';
  import type { BlockItem } from '../../utils/storage';
  import {
    addBlockedUrl,
    addDomain,
    get,
    getAllBlocked,
    removeBlockedItem,
    setBlockAds,
    setBlockSubdomains,
    setEnabled,
    subscribe,
  } from '../../utils/storage';

  type RuleFilter = 'all' | 'domain' | 'url' | 'selector';

  let blockedItems: BlockItem[] = [];
  let inputValue = '';
  let errorMsg = '';
  let blockAds = false;
  let blockSubdomains = true;
  let activeFilter: RuleFilter = 'all';
  let searchQuery = '';
  let activeTab: 'dashboard' | 'rules' | 'method' = 'dashboard';
  let showAddDialog = false;
  let dialogInputEl: HTMLInputElement;
  let totalBlockCount = 0;
  let adBlockCount = 0;
  let domainBlockCount = 0;
  let todayBlockCount = 0;
  let enabled = true;
  let weekStats: { date: string; count: number }[] = [];
  let topBlockedDomains: { domain: string; count: number }[] = [];

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
  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('zh-CN', { weekday: 'short' });
  }

  function openAddDialog() {
    inputValue = '';
    errorMsg = '';
    showAddDialog = true;
    requestAnimationFrame(() => dialogInputEl?.focus());
  }

  function closeAddDialog() {
    showAddDialog = false;
    inputValue = '';
    errorMsg = '';
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeAddDialog();
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showAddDialog) closeAddDialog();
  }
  async function loadData() {
    const storage = await get();
    blockedItems = await getAllBlocked();
    blockAds = storage.blockAds ?? false;
    blockSubdomains = storage.blockSubdomains ?? true;
    totalBlockCount = storage.blockCount ?? 0;
    adBlockCount = storage.adBlockCount ?? 0;
    domainBlockCount = storage.domainBlockCount ?? 0;
    topBlockedDomains = storage.blockedDomainStats ?? [];
    enabled = storage.enabled ?? true;
    weekStats = buildWeekStats(storage.stats ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const todayStat = (storage.stats ?? []).find(s => s.date === today);
    todayBlockCount = todayStat?.count ?? 0;
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;

    errorMsg = '';

    try {
      const { urls, blockedUrls } = await get();

      if (value.startsWith('http') && new URL(value).pathname !== '/') {
        if (blockedUrls.includes(value)) {
          errorMsg = '该链接已存在于规则中心';
          return;
        }
        await addBlockedUrl(value);
      } else {
        const domain = value.startsWith('http')
          ? new URL(value).hostname.replace(/^www\./, '')
          : value.replace(/^www\./, '');
        new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        if (urls.includes(domain)) {
          errorMsg = '该域名已存在于规则中心';
          return;
        }
        await addDomain(domain);
      }

      inputValue = '';
      await loadData();
      closeAddDialog();
    } catch {
      errorMsg = '请输入有效的域名或完整 URL';
    }
  }

  async function handleRemove(item: BlockItem) {
    await removeBlockedItem(item.type, item.index);
    await loadData();
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  async function toggleAdBlock() {
    blockAds = !blockAds;
    await setBlockAds(blockAds);
  }

  async function toggleSubdomainBlock() {
    blockSubdomains = !blockSubdomains;
    await setBlockSubdomains(blockSubdomains);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') handleAdd();
  }

  function formatTypeLabel(type: BlockItem['type']): string {
    if (type === 'domain') return '域名';
    if (type === 'url') return '链接';
    return '选择器';
  }

  function matchesQuery(item: BlockItem, query: string): boolean {
    if (!query.trim()) return true;
    const normalizedQuery = query.trim().toLowerCase();
    return item.value.toLowerCase().includes(normalizedQuery)
      || formatTypeLabel(item.type).toLowerCase().includes(normalizedQuery);
  }

  $: totalCount = blockedItems.length;
  $: domainCount = blockedItems.filter((item) => item.type === 'domain').length;
  $: urlCount = blockedItems.filter((item) => item.type === 'url').length;
  $: selectorCount = blockedItems.filter((item) => item.type === 'selector').length;
  $: maxCount = Math.max(...weekStats.map(s => s.count), 1);
  $: adPct = totalBlockCount > 0 ? Math.round((adBlockCount / totalBlockCount) * 100) : 0;
  $: domainPct = totalBlockCount > 0 ? Math.round((domainBlockCount / totalBlockCount) * 100) : 0;
  $: otherPct = Math.max(0, 100 - adPct - domainPct);
  $: filteredItems = blockedItems.filter((item) =>
    (activeFilter === 'all' || item.type === activeFilter) && matchesQuery(item, searchQuery),
  );

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="app">
  <!-- NAV -->
  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-left">
        <div class="nav-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" opacity="0.2"/>
            <path d="M7 12l3 3 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="brand-label">Search Result Blocker</span>
        </div>
        <div class="nav-links">
          <button class="nav-link" class:active={activeTab === 'dashboard'} onclick={() => activeTab = 'dashboard'}>概览</button>
          <button class="nav-link" class:active={activeTab === 'rules'} onclick={() => activeTab = 'rules'}>规则中心</button>
          <button class="nav-link" class:active={activeTab === 'method'} onclick={() => activeTab = 'method'}>设置</button>
        </div>
      </div>
      <div class="nav-right">
        <span class="rule-badge">
          <span class="badge-dot"></span>
          已启用
        </span>
      </div>
    </div>
  </nav>

  <!-- BODY -->
  <main class="main">
    {#if activeTab === 'dashboard'}
      <!-- DASHBOARD -->
      <div class="dash-grid">
        <!-- TOP ROW: KEY STATS -->
        <section class="dash-block">
          <article class="block-stat primary">
            <span class="block-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M4.93 4.93 19.07 19.07"/>
              </svg>
            </span>
            <div>
              <span class="block-stat-label">累计拦截</span>
              <strong class="block-stat-value">{totalBlockCount}</strong>
            </div>
          </article>
          <article class="block-stat">
            <span class="block-stat-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </span>
            <div>
              <span class="block-stat-label">今日拦截</span>
              <strong class="block-stat-value">{todayBlockCount}</strong>
            </div>
          </article>
          <article class="block-stat">
            <span class="block-stat-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10h-10z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </span>
            <div>
              <span class="block-stat-label">运行状态</span>
              <strong class="block-stat-value">{enabled ? '运行中' : '已暂停'}</strong>
            </div>
            <button class="status-toggle" class:active={enabled} onclick={toggleEnabled} aria-label="切换运行状态">
              {enabled ? '暂停' : '启动'}
            </button>
          </article>
        </section>

        <!-- SECOND ROW: BLOCK BREAKDOWN -->
        <section class="dash-breakdown">
          <div class="dash-breakdown-card">
            <span class="breakdown-label">拦截构成</span>
            <div class="breakdown-bar">
              {#if adPct > 0}
                <div class="breakdown-segment ad" style="flex: {adPct}" title="广告拦截 {adPct}%">
                  <span class="breakdown-seg-label">广告 {adPct}%</span>
                </div>
              {/if}
              {#if domainPct > 0}
                <div class="breakdown-segment domain" style="flex: {domainPct}" title="域名拦截 {domainPct}%">
                  <span class="breakdown-seg-label">域名 {domainPct}%</span>
                </div>
              {/if}
              {#if otherPct > 0}
                <div class="breakdown-segment other" style="flex: {otherPct}" title="其他 {otherPct}%"></div>
              {/if}
            </div>
            <div class="breakdown-legend">
              <span class="legend-item"><span class="legend-dot ad"></span>广告 {adBlockCount} 次</span>
              <span class="legend-item"><span class="legend-dot domain"></span>域名 {domainBlockCount} 次</span>
              <span class="legend-item"><span class="legend-dot other"></span>其他 {Math.max(0, totalBlockCount - adBlockCount - domainBlockCount)} 次</span>
            </div>
          </div>
        </section>

        <!-- BOTTOM ROW: CHART + TOP DOMAINS -->
        <div class="dash-bottom-row">
          <section class="dash-section-card">
            <div class="dash-section-heading">
              <h2 class="card-title">近 7 天趋势</h2>
              <p class="card-desc">每日拦截次数统计</p>
            </div>
            <div class="chart">
              {#each weekStats as day}
                <div class="chart-bar-group" title="{day.date}: {day.count} 次">
                  <div class="chart-bar" style="height: {Math.max((day.count / maxCount) * 80, 3)}px;" class:zero={day.count === 0}></div>
                  <span class="chart-bar-label">{dayLabel(day.date)}</span>
                </div>
              {/each}
            </div>
          </section>

          <section class="dash-section-card">
            <div class="dash-section-heading">
              <h2 class="card-title">被拦截最多的域名</h2>
              <p class="card-desc">按拦截次数排序</p>
            </div>
            {#if topBlockedDomains.length === 0}
              <div class="top-domain-empty">暂无数据</div>
            {:else}
              <div class="top-domain-list">
                {#each topBlockedDomains as item, i}
                  <div class="top-domain-row">
                    <span class="top-domain-rank">{i + 1}</span>
                    <code class="top-domain-name">{item.domain}</code>
                    <span class="top-domain-count">{item.count} 次</span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </div>
      </div>

    {:else if activeTab === 'rules'}
      <!-- RULES LIST -->
      <section class="rules-section">
        <div class="rules-bar">
          <div>
            <h2 class="card-title">已保存规则</h2>
            <p class="card-desc">管理所有屏蔽规则</p>
          </div>
          <div class="rules-actions">
            <button class="btn-primary add-trigger" onclick={openAddDialog}>+ 添加规则</button>
            <div class="filter-tabs" role="tablist">
              <button class:active={activeFilter === 'all'} onclick={() => activeFilter = 'all'}>全部</button>
              <button class:active={activeFilter === 'domain'} onclick={() => activeFilter = 'domain'}>域名</button>
              <button class:active={activeFilter === 'url'} onclick={() => activeFilter = 'url'}>链接</button>
              <button class:active={activeFilter === 'selector'} onclick={() => activeFilter = 'selector'}>选择器</button>
            </div>
            <input
              class="search-box"
              type="search"
              bind:value={searchQuery}
              placeholder="搜索规则…"
            />
          </div>
        </div>

        {#if totalCount === 0}
          <div class="empty">
            <div class="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10h-10z"/>
                <path d="M12 12 7 7"/>
                <path d="M12 6v6"/>
              </svg>
            </div>
            <h3>还没有任何规则</h3>
            <p>点击"+ 添加规则"后，规则将显示在此处</p>
          </div>
        {:else if filteredItems.length === 0}
          <div class="empty">
            <h3>没有匹配结果</h3>
            <p>尝试切换筛选类型或调整搜索关键词</p>
          </div>
        {:else}
          <div class="table" role="table">
            <div class="table-head" role="row">
              <span>类型</span>
              <span>内容</span>
              <span>操作</span>
            </div>
            {#each filteredItems as item}
              <div class="table-row" role="row">
                <span class="type-cell">
                  <span class="badge" class:domain={item.type === 'domain'} class:url={item.type === 'url'} class:selector={item.type === 'selector'}>
                    {formatTypeLabel(item.type)}
                  </span>
                </span>
                <span class="value-cell">
                  <code>{item.value}</code>
                </span>
                <span class="action-cell">
                  <button class="btn-ghost" onclick={() => handleRemove(item)}>删除</button>
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </section>

    {:else}
      <!-- SETTINGS TAB -->
      <div class="method-card">
        <div class="method-heading">
          <h2 class="card-title">匹配方式</h2>
          <p class="card-desc">控制规则匹配行为，按需开启或关闭</p>
        </div>
        <div class="toggle-list">
          <div class="toggle-item">
            <div class="toggle-copy">
              <strong>广告标记</strong>
              <p>自动识别搜索结果中的广告并标记</p>
            </div>
            <label class="toggle" aria-label="切换广告标记">
              <input type="checkbox" checked={blockAds} onchange={toggleAdBlock} />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-copy">
              <strong>子域名匹配</strong>
              <p>主域名规则自动覆盖子域名</p>
            </div>
            <label class="toggle" aria-label="切换子域名匹配">
              <input type="checkbox" checked={blockSubdomains} onchange={toggleSubdomainBlock} />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <!-- ADD RULE DIALOG -->
  {#if showAddDialog}
    <div class="overlay" role="presentation" onclick={onBackdropClick}>
      <div class="dialog" role="dialog" aria-labelledby="dialog-title">
        <div class="dialog-header">
          <div>
            <h2 id="dialog-title" class="card-title">新增规则</h2>
            <p class="card-desc">输入域名或完整链接地址</p>
          </div>
          <button class="dialog-close" onclick={closeAddDialog} aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-row">
          <input
            bind:this={dialogInputEl}
            type="text"
            bind:value={inputValue}
            onkeydown={handleKeydown}
            placeholder="输入 example.com 或 https://…"
          />
          <button class="btn-primary" onclick={handleAdd}>添加</button>
        </div>
        {#if errorMsg}
          <p class="feedback error">{errorMsg}</p>
        {:else}
          <p class="feedback hint">域名用于站点级拦截，完整链接用于处理单条固定结果</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    min-width: 1024px;
    background: #f4f7f5;
    color: #18211d;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :global(*) { box-sizing: border-box; }

  /* ─── NAV ─── */
  .nav {
    background: #0a5532;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .nav-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
  }
  .nav-left { display: flex; align-items: center; gap: 32px; }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .brand-label { white-space: nowrap; }
  .nav-links { display: flex; gap: 4px; }
  .nav-link {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(255,255,255,0.65);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .nav-link.active { color: #fff; background: rgba(255,255,255,0.12); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .rule-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.13);
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-weight: 600;
  }
  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.25);
  }

  /* ─── MAIN ─── */
  .main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
  }

  /* ─── STATS BAR ─── */
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    padding: 16px 20px;
    border-radius: 14px;
    border: 1px solid #dde6e1;
    background: #fff;
    transition: box-shadow 0.15s;
  }
  .stat-card.active {
    border-color: #c2ddd1;
    background: linear-gradient(135deg, #f6fcf9 0%, #ebf5f0 100%);
  }
  .stat-label {
    display: block;
    margin-bottom: 4px;
    color: #64756d;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .stat-value {
    display: block;
    color: #0a5532;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .stat-desc {
    margin: 6px 0 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.4;
  }

  /* ─── DASHBOARD ─── */
  .dash-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ─── BLOCK STATS ─── */
  .dash-block {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .block-stat {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    border: 1px solid #dde6e1;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .block-stat.primary {
    border-color: #c2ddd1;
    background: linear-gradient(135deg, #f6fcf9 0%, #ebf5f0 100%);
  }
  .block-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
    background: #f0f5f2;
    color: #0a5532;
  }
  .block-stat-icon.orange { color: #c47a2d; background: #fef6ee; }
  .block-stat-icon.green { color: #0d8f66; background: #eaf7f1; }
  .block-stat-label {
    display: block;
    color: #64756d;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .block-stat-value {
    display: block;
    color: #18211d;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .status-toggle {
    margin-left: auto;
    padding: 6px 14px;
    border: 1px solid #ccd7d2;
    border-radius: 8px;
    background: #fff;
    color: #607169;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
  }
  .status-toggle.active { border-color: #0d8f66; color: #0d8f66; }
  .status-toggle:hover { background: #f4f7f5; }

  .dash-section-heading { margin-bottom: 14px; }

  /* ─── BREAKDOWN BAR ─── */
  .dash-breakdown { margin-bottom: 0; }
  .dash-breakdown-card {
    padding: 18px 20px;
    border: 1px solid #dde6e1;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .breakdown-label {
    display: block;
    color: #64756d;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .breakdown-bar {
    display: flex;
    height: 28px;
    border-radius: 8px;
    overflow: hidden;
    background: #eef2f0;
  }
  .breakdown-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    transition: flex 0.3s;
  }
  .breakdown-segment.ad { background: #c43d3d; }
  .breakdown-segment.domain { background: #0d8f66; }
  .breakdown-segment.other { background: #b7c6be; }
  .breakdown-seg-label {
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 4px;
  }
  .breakdown-legend {
    display: flex;
    gap: 16px;
    margin-top: 10px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #607169;
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .legend-dot.ad { background: #c43d3d; }
  .legend-dot.domain { background: #0d8f66; }
  .legend-dot.other { background: #b7c6be; }

  /* ─── BOTTOM ROW ─── */
  .dash-bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .dash-section-card {
    padding: 20px;
    border: 1px solid #dde6e1;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }

  /* ─── CHART ─── */
  .chart {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 96px;
  }
  .chart-bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .chart-bar {
    width: 100%;
    max-width: 40px;
    background: linear-gradient(180deg, #0d8f66, #6ee7b7);
    border-radius: 4px 4px 2px 2px;
    min-height: 3px;
    transition: height 0.3s ease;
  }
  .chart-bar.zero { background: #e2e9e4; }
  .chart-bar-label {
    font-size: 10px;
    color: #9aa8a1;
    margin-top: 6px;
    font-weight: 500;
  }

  /* ─── TOP BLOCKED DOMAINS ─── */
  .top-domain-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    color: #9aa8a1;
    font-size: 14px;
  }
  .top-domain-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .top-domain-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    transition: background 0.12s;
  }
  .top-domain-row:hover { background: #f4f7f5; }
  .top-domain-rank {
    width: 20px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #9aa8a1;
  }
  .top-domain-name {
    flex: 1;
    font-size: 13px;
    font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
    color: #1d2a24;
    word-break: break-all;
    line-height: 1.4;
  }
  .top-domain-count {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: #0a5532;
  }


  /* ─── RULES SECTION (full width) ─── */
  .rules-section {
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .rules-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  /* ─── METHOD SETTINGS TAB ─── */
  .method-card {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .method-heading {
    margin-bottom: 16px;
  }

  /* ─── SECTION HEADINGS ─── */
  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .card-desc {
    margin: 4px 0 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }

  /* ─── ADD TRIGGER BUTTON ─── */
  .add-trigger {
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 9px;
    background: #0c8d65;
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .add-trigger:hover { background: #087654; }

  /* ─── DIALOG ─── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(24,33,29,0.35);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: 460px;
    padding: 24px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 12px 40px rgba(24,33,29,0.15);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }
  .dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6d7f77;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .dialog-close:hover { background: #f4f7f5; color: #18211d; }

  /* ─── ADD ROW ─── */
  .add-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .add-row input {
    width: 100%;
    height: 42px;
    padding: 0 14px;
    border: 1px solid #ccd7d2;
    border-radius: 10px;
    background: #fff;
    color: #18211d;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .add-row input:focus {
    border-color: #0d8f66;
    box-shadow: 0 0 0 3px rgba(13,143,102,0.12);
  }
  .btn-primary {
    height: 42px;
    padding: 0 22px;
    border: none;
    border-radius: 10px;
    background: #0c8d65;
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #087654; }
  .btn-primary:active { background: #066244; }

  .feedback {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.45;
  }
  .feedback.hint { color: #6d7f77; }
  .feedback.error { color: #c43d3d; font-weight: 600; }

  /* ─── TOGGLES ─── */
  .toggle-list { border-top: 1px solid #ecf1ee; }
  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid #ecf1ee;
  }
  .toggle-item:last-child { border-bottom: none; }
  .toggle-copy strong {
    display: block;
    font-size: 15px;
    margin-bottom: 2px;
  }
  .toggle-copy p {
    margin: 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }
  .toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-track {
    position: relative;
    width: 44px;
    height: 26px;
    border-radius: 999px;
    background: #cfd8d3;
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track { background: #0d8f66; }
  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }

  /* ─── RULES ACTIONS ─── */
  .rules-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .filter-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    border-radius: 10px;
    background: #f4f7f5;
    border: 1px solid #dfe7e2;
  }
  .filter-tabs button {
    padding: 6px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #607169;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, box-shadow 0.12s;
  }
  .filter-tabs button.active {
    background: #fff;
    color: #0a5532;
    box-shadow: 0 1px 3px rgba(24,33,29,0.08);
  }
  .search-box {
    width: 180px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid #ccd7d2;
    border-radius: 9px;
    background: #fff;
    color: #18211d;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-box:focus {
    border-color: #0d8f66;
    box-shadow: 0 0 0 3px rgba(13,143,102,0.12);
  }

  /* ─── EMPTY ─── */
  .empty {
    padding: 48px 24px;
    border: 1px dashed #d3dcd7;
    border-radius: 14px;
    background: #fafbfb;
    text-align: center;
  }
  .empty-icon {
    color: #b7c6be;
    margin-bottom: 12px;
  }
  .empty h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 700;
  }
  .empty p {
    margin: 0;
    color: #6d7f77;
    font-size: 14px;
  }

  /* ─── TABLE ─── */
  .table {
    border: 1px solid #e2e9e4;
    border-radius: 12px;
    overflow: hidden;
  }
  .table-head {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: #f5f8f6;
    color: #677a71;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .table-row {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid #edf2ef;
    transition: background 0.12s;
  }
  .table-row:hover { background: #fafcfb; }
  .badge {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .badge.domain { background: #e8f6ef; color: #0a7a55; }
  .badge.url { background: #edf5f0; color: #155f46; }
  .badge.selector { background: #f0f3f1; color: #566861; }
  .value-cell code {
    display: block;
    color: #1d2a24;
    font-size: 13px;
    font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
    word-break: break-all;
    line-height: 1.5;
  }
  .action-cell { display: flex; justify-content: flex-end; }
  .btn-ghost {
    padding: 6px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6d7e76;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .btn-ghost:hover { background: #fef1f1; color: #c43d3d; }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1100px) {
    :global(body) { min-width: 0; }
    .stats-bar { grid-template-columns: repeat(2, 1fr); }
    .dash-block { grid-template-columns: 1fr 1fr; }
    .dash-bottom-row { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .stats-bar { grid-template-columns: 1fr; }
    .dash-block { grid-template-columns: 1fr; }
    .dash-bottom-row { grid-template-columns: 1fr; }
    .breakdown-legend { flex-direction: column; gap: 6px; }
    .block-stat .status-toggle { display: none; }
    .nav-links { display: none; }
    .filter-tabs { order: 2; }
    .search-box { width: 100%; }
    .rules-bar { flex-direction: column; }
    .table-head, .table-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .action-cell { justify-content: flex-start; }
  }
</style>
