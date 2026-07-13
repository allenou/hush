<script lang="ts">
  import { RULE_FILTERS, RULE_FILTER_LABEL } from '@/constants';
  import type { RuleFilter } from '@/constants';
  import { t } from '@/utils/locale-store.svelte';

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

  let filterLabel = $derived.by(() => {
    const map: Record<string, string> = {};
    for (const f of RULE_FILTERS) {
      map[f] = t(RULE_FILTER_LABEL[f]);
    }
    return map;
  });

  function formatTypeLabel(type: string): string {
    return t(RULE_FILTER_LABEL[type as RuleFilter]) ?? type;
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
      <h2 class="card-title">{t('savedRules')}</h2>
    </div>
    <div class="rules-actions">
      <input
        class="search-box"
        type="search"
        bind:value={searchQuery}
        placeholder={t('searchRules')}
      />
      <div class="filter-tabs" role="tablist">
        {#each RULE_FILTERS as id}
          <button class:active={activeFilter === id} onclick={() => handleFilterChange(id)}>{filterLabel[id]}</button>
        {/each}
      </div>
      <button class="add-trigger" onclick={handleAddRule}>{t('addRule')}</button>
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
      <h3>{t('noRulesYet')}</h3>
      <p>{t('noRulesYetDesc')}</p>
    </div>
  {:else if filteredItems.length === 0}
    <div class="empty">
      <h3>{t('noMatch')}</h3>
      <p>{t('noMatchDesc')}</p>
    </div>
  {:else}
    <div class="table" role="table">
      <div class="table-head" role="row">
        <span>{t('typeColumn')}</span>
        <span>{t('contentColumn')}</span>
        <span>{t('actionColumn')}</span>
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
            <button class="btn-ghost" onclick={() => handleRemove(item)}>{t('delete')}</button>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .rules-section {
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    padding: var(--srb-space-xl);
    box-shadow: var(--srb-shadow-xs);
  }
  .rules-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--srb-space-lg);
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .card-title {
    margin: 0;
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--srb-line-height-tight);
  }
  .rules-actions {
    display: flex;
    gap: var(--srb-space-sm);
    align-items: center;
    flex-wrap: wrap;
  }
  .add-trigger {
    height: var(--srb-button-height-compact);
    padding: 0 14px;
    border: none;
    border-radius: var(--srb-radius-lg);
    background: var(--srb-primary-action);
    color: var(--srb-on-primary);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-bold);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--srb-transition-base);
  }
  .add-trigger:hover { background: var(--srb-primary-hover); }

  .filter-tabs {
    display: inline-flex;
    gap: var(--srb-space-2xs);
    padding: 3px;
    border-radius: var(--srb-radius-lg);
    background: var(--srb-bg);
    border: 1px solid var(--srb-border);
  }
  .filter-tabs button {
    padding: 6px 12px;
    border: none;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-text-secondary);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
    transition: background var(--srb-transition-fast), color var(--srb-transition-fast), box-shadow var(--srb-transition-fast);
  }
  .filter-tabs button.active {
    background: var(--srb-surface);
    color: var(--srb-primary);
    box-shadow: var(--srb-shadow-xs);
  }

  .search-box {
    width: 180px;
    height: var(--srb-input-height-compact);
    padding: 0 12px;
    border: 1px solid var(--srb-border-strong);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    outline: none;
    transition: border-color var(--srb-transition-base), box-shadow var(--srb-transition-base);
  }
  .search-box:focus {
    border-color: var(--srb-engine-google);
    box-shadow: var(--srb-focus-ring);
  }

  .empty {
    padding: var(--srb-space-4xl) var(--srb-space-2xl);
    border: 1px dashed var(--srb-dashed-border);
    border-radius: var(--srb-radius-xl);
    text-align: center;
  }
  .empty-icon {
    color: var(--srb-segment-other);
    margin-bottom: var(--srb-space-md);
  }
  .empty h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: var(--srb-weight-bold);
  }
  .empty p {
    margin: 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-body);
  }

  .table {
    border: 1px solid var(--srb-border-light);
    border-radius: 12px;
    overflow: hidden;
  }
  .table-head {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: var(--srb-table-head);
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-caps);
    text-transform: uppercase;
  }
  .table-row {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--srb-row-divider);
    transition: background var(--srb-transition-fast);
  }
  .table-row:hover { background: var(--srb-row-hover); }

  .type-cell { display: flex; }

  .badge {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: var(--srb-radius-full);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
  }
  .badge.domain { background: var(--srb-domain-bg); color: var(--srb-domain-text); }
  .badge.url { background: var(--srb-url-bg); color: var(--srb-url-text); }
  .badge.selector { background: var(--srb-selector-bg); color: var(--srb-text-secondary); }

  .value-cell code {
    display: block;
    color: var(--srb-text-code);
    font-size: var(--srb-font-size-sm);
    font-family: var(--srb-mono);
    word-break: break-all;
    line-height: var(--srb-line-height-code);
  }
  .action-cell { display: flex; justify-content: flex-end; }

  .btn-ghost {
    padding: 6px 10px;
    border: none;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-text-subtle);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-bold);
    cursor: pointer;
    transition: background var(--srb-transition-fast), color var(--srb-transition-fast);
  }
  .btn-ghost:hover { background: var(--srb-danger-soft-bg); color: var(--srb-danger); }
</style>
