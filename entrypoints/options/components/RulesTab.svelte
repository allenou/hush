<script lang="ts">
  import { RULE_FILTERS, RULE_FILTER_LABEL } from '../../../constants';
  import type { RuleFilter } from '../../../constants';

  let {
    filteredItems = [],
    totalCount = 0,
    activeFilter = 'all' as RuleFilter,
    searchQuery = '',
    onAddRule,
    onFilterChange,
    onRemove,
  }: {
    filteredItems?: any[];
    totalCount?: number;
    activeFilter?: RuleFilter;
    searchQuery?: string;
    onAddRule?: () => void;
    onFilterChange?: (filter: RuleFilter) => void;
    onRemove?: (item: any) => void;
  } = $props();

  function formatTypeLabel(type: string): string {
    return RULE_FILTER_LABEL[type as RuleFilter] ?? type;
  }

  function handleAddRule() {
    onAddRule?.();
  }

  function handleFilterChange(filter: RuleFilter) {
    onFilterChange?.(filter);
  }

  function handleRemove(item: any) {
    onRemove?.(item);
  }
</script>

<section class="rules-section">
  <div class="rules-bar">
    <div>
      <h2 class="card-title">已保存规则</h2>
      <p class="card-desc">管理所有屏蔽规则</p>
    </div>
    <div class="rules-actions">
      <input
        class="search-box"
        type="search"
        bind:value={searchQuery}
        placeholder="搜索规则…"
      />
      <div class="filter-tabs" role="tablist">
        {#each RULE_FILTERS as { id, label }}
          <button class:active={activeFilter === id} onclick={() => handleFilterChange(id)}>{label}</button>
        {/each}
      </div>
      <button class="add-trigger" onclick={handleAddRule}>+ 添加规则</button>
    </div>
  </div>

  {#if totalCount === 0}
    <div class="empty">
      <div class="empty-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
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

<style>
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

  .rules-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
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

  .type-cell { display: flex; }

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
</style>
