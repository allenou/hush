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
    onSearchQueryChange,
    onRemove,
  }: {
    filteredItems?: any[];
    totalCount?: number;
    activeFilter?: RuleFilter;
    searchQuery?: string;
    onAddRule?: () => void;
    onFilterChange?: (filter: RuleFilter) => void;
    onSearchQueryChange?: (value: string) => void;
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

  function handleSearchInput(event: Event) {
    onSearchQueryChange?.((event.currentTarget as HTMLInputElement).value);
  }
</script>

<section class="rules-section">
  <div class="rules-bar">
    <div>
      <h2 class="card-title">{t('savedRules')}</h2>
    </div>
    <div class="rules-actions">
      {#if totalCount > 0}
        <input
          class="search-box"
          type="search"
          value={searchQuery}
          oninput={handleSearchInput}
          placeholder={t('searchRules')}
        />
        <div class="filter-tabs">
          {#each RULE_FILTERS as id}
            <button
              type="button"
              class:active={activeFilter === id}
              aria-pressed={activeFilter === id}
              onclick={() => handleFilterChange(id)}
            >{filterLabel[id]}</button>
          {/each}
        </div>
      {/if}
      <button type="button" class="add-trigger" onclick={handleAddRule}>{t('addRule')}</button>
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
            {#if item.type === 'selector' && item.scope}
              <small>{item.scope}</small>
            {/if}
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
    border: 1px solid var(--hush-border);
    border-radius: var(--hush-radius-card);
    background: var(--hush-surface);
    padding: var(--hush-space-xl);
    box-shadow: var(--hush-shadow-xs);
  }
  .rules-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--hush-space-lg);
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .card-title {
    margin: 0;
    font-size: var(--hush-font-size-title);
    font-weight: var(--hush-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--hush-line-height-tight);
  }
  .rules-actions {
    --rules-control-height: var(--hush-input-height-compact);
    display: flex;
    gap: var(--hush-space-sm);
    align-items: center;
    flex-wrap: wrap;
  }
  .add-trigger {
    height: var(--rules-control-height);
    padding: 0 14px;
    border: none;
    border-radius: var(--hush-radius-lg);
    background: var(--hush-primary-action);
    color: var(--hush-on-primary);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--hush-transition-base);
  }
  .add-trigger:hover { background: var(--hush-primary-action-hover); }
  .add-trigger:focus-visible {
    outline: none;
    box-shadow: var(--hush-focus-ring);
  }

  .filter-tabs {
    display: inline-flex;
    gap: var(--hush-space-2xs);
    height: var(--rules-control-height);
    padding: 3px;
    box-sizing: border-box;
    border-radius: var(--hush-radius-lg);
    background: var(--hush-bg);
    border: 1px solid var(--hush-border);
  }
  .filter-tabs button {
    display: inline-flex;
    align-items: center;
    height: 100%;
    padding: 0 12px;
    border: none;
    border-radius: var(--hush-radius-md);
    background: transparent;
    color: var(--hush-text-secondary);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-semibold);
    cursor: pointer;
    transition: background var(--hush-transition-fast), color var(--hush-transition-fast), box-shadow var(--hush-transition-fast);
  }
  .filter-tabs button:hover {
    background: var(--hush-control-hover-bg);
    color: var(--hush-text);
  }
  .filter-tabs button.active {
    background: var(--hush-surface);
    color: var(--hush-primary);
    box-shadow: var(--hush-shadow-xs);
  }
  .filter-tabs button:focus-visible {
    position: relative;
    z-index: 1;
    outline: none;
    box-shadow: var(--hush-focus-ring);
  }

  .search-box {
    width: 180px;
    height: var(--rules-control-height);
    padding: 0 12px;
    border: 1px solid var(--hush-border-strong);
    border-radius: var(--hush-radius-lg);
    background: var(--hush-surface);
    color: var(--hush-text);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    outline: none;
    transition: border-color var(--hush-transition-base), box-shadow var(--hush-transition-base);
  }
  .search-box:focus {
    border-color: var(--hush-engine-google);
    box-shadow: var(--hush-focus-ring);
  }

  .empty {
    padding: var(--hush-space-4xl) var(--hush-space-2xl);
    text-align: center;
  }
  .empty-icon {
    color: var(--hush-segment-other);
    margin-bottom: var(--hush-space-md);
  }
  .empty h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: var(--hush-weight-bold);
  }
  .empty p {
    margin: 0;
    color: var(--hush-text-subtle);
    font-size: var(--hush-font-size-body);
  }

  .table {
    border: 1px solid var(--hush-border-light);
    border-radius: 12px;
    overflow: hidden;
  }
  .table-head {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: var(--hush-table-head);
    color: var(--hush-text-secondary);
    font-size: var(--hush-font-size-xs);
    font-weight: var(--hush-weight-bold);
    letter-spacing: var(--hush-tracking-caps);
    text-transform: uppercase;
  }
  .table-row {
    display: grid;
    grid-template-columns: 90px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--hush-row-divider);
    transition: background var(--hush-transition-fast);
  }
  .table-row:hover { background: var(--hush-row-hover); }

  .type-cell { display: flex; }

  .badge {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: var(--hush-radius-full);
    font-size: var(--hush-font-size-xs);
    font-weight: var(--hush-weight-bold);
  }
  .badge.domain { background: var(--hush-domain-bg); color: var(--hush-domain-text); }
  .badge.url { background: var(--hush-url-bg); color: var(--hush-url-text); }
  .badge.selector { background: var(--hush-selector-bg); color: var(--hush-text-secondary); }

  .value-cell code {
    display: block;
    color: var(--hush-text-code);
    font-size: var(--hush-font-size-sm);
    font-family: var(--hush-mono);
    word-break: break-all;
    line-height: var(--hush-line-height-code);
  }
  .value-cell small {
    display: block;
    margin-bottom: 3px;
    color: var(--hush-text-muted);
    font-size: var(--hush-font-size-xs);
  }
  .action-cell { display: flex; justify-content: flex-end; }

  .btn-ghost {
    padding: 6px 10px;
    border: none;
    border-radius: var(--hush-radius-md);
    background: transparent;
    color: var(--hush-text-subtle);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    transition: background var(--hush-transition-fast), color var(--hush-transition-fast);
  }
  .btn-ghost:hover { background: var(--hush-danger-soft-bg); color: var(--hush-danger); }
</style>
