<script lang="ts">
  import type { SearchRecord } from '@/utils/storage';
  import { SEARCH_ENGINES } from '@/constants';
  import { formatRelativeTime } from '@/utils/time';
  import { t } from '@/utils/locale-store.svelte';

  let { searchHistory = [], onSearch } = $props<{
    searchHistory: SearchRecord[];
    onSearch?: (detail: { record: SearchRecord; engineHostname?: string }) => void;
  }>();

  let searchEngineMenus = $state<Record<number, boolean>>({});

  function toggleEngineMenu(index: number) {
    searchEngineMenus = { ...searchEngineMenus, [index]: !searchEngineMenus[index] };
  }

  function closeEngineMenu(index: number) {
    searchEngineMenus = { ...searchEngineMenus, [index]: false };
  }

  function doSearch(record: SearchRecord, engineHostname?: string) {
    onSearch?.({ record, engineHostname });
  }
</script>

<section class="search-section">
  <div class="search-section-heading">
    <h2 class="card-title">{t('searchHistory')}</h2>
    <p class="card-desc">{t('searchHistoryDesc')}</p>
  </div>

  {#if searchHistory.length === 0}
    <div class="empty">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <h3>{t('noHistory')}</h3>
      <p>{t('noHistoryDesc')}</p>
    </div>
  {:else}
    <div class="search-table" role="table">
      <div class="search-table-head" role="row">
        <span>{t('keywordColumn')}</span>
        <span>{t('engineColumn')}</span>
        <span>{t('timeColumn')}</span>
        <span>{t('actionColumn')}</span>
      </div>
      {#each searchHistory as record, i}
        <div class="search-table-row" role="row">
          <span class="search-table-query">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span>{record.query}</span>
          </span>
          <span>
            <span class="search-engine-tag">{record.engineName}</span>
          </span>
          <span class="search-table-time">{formatRelativeTime(record.timestamp)}</span>
          <span class="search-table-actions">
            <button class="btn-ghost" onclick={() => doSearch(record)}>{t('searchAction')}</button>
            <div class="search-switch-wrapper" role="presentation" onclick={(e) => { e.stopPropagation(); toggleEngineMenu(i); }}>
              <button class="search-switch-btn" aria-label={t('switchEngine')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {#if searchEngineMenus[i]}
                <div class="search-engine-menu" role="presentation" onclick={(e) => e.stopPropagation()}
                  onmouseleave={() => closeEngineMenu(i)}
                >
                  {#each SEARCH_ENGINES as engine}
                    <button class="search-engine-opt" onclick={() => { doSearch(record, engine.hostname); closeEngineMenu(i); }}>
                      <span class="se-dot" style="background:{engine.color}"></span>
                      {engine.label}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .search-section {
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    padding: var(--srb-space-xl);
    box-shadow: var(--srb-shadow-xs);
  }
  .search-section-heading {
    margin-bottom: 16px;
  }
  .card-title {
    margin: 0;
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--srb-line-height-tight);
  }
  .card-desc {
    margin: 4px 0 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
  }

  .empty {
    padding: var(--srb-space-4xl) var(--srb-space-2xl);
    border: 1px dashed var(--srb-dashed-border);
    border-radius: var(--srb-radius-xl);
    background: var(--srb-empty-bg);
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

  .search-table {
    border: 1px solid var(--srb-border-light);
    border-radius: 12px;
    overflow: hidden;
  }
  .search-table-head {
    display: grid;
    grid-template-columns: 1fr 80px 100px 120px;
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
  .search-table-row {
    display: grid;
    grid-template-columns: 1fr 80px 100px 120px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--srb-row-divider);
    transition: background var(--srb-transition-fast);
  }
  .search-table-row:hover { background: var(--srb-row-hover); }
  .search-table-query {
    display: flex;
    align-items: center;
    gap: var(--srb-space-sm);
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    color: var(--srb-text);
  }
  .search-table-query .search-icon { color: var(--srb-text-muted); flex-shrink: 0; }
  .search-engine-tag {
    padding: 2px 7px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-accent-soft);
    color: var(--srb-domain-text);
    font-size: var(--srb-font-size-2xs);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-label);
  }
  .search-table-time {
    font-size: var(--srb-font-size-sm);
    color: var(--srb-text-subtle);
  }
  .search-table-actions {
    display: flex;
    align-items: center;
    gap: var(--srb-space-2xs);
  }
  .search-table-actions .btn-ghost {
    padding: 4px 10px;
    font-size: var(--srb-font-size-xs);
  }
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

  .search-switch-wrapper {
    position: relative;
    display: flex;
  }
  .search-switch-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: var(--srb-radius-xs);
    background: transparent;
    color: var(--srb-text-muted);
    cursor: pointer;
    transition: background var(--srb-transition-fast), color var(--srb-transition-fast);
  }
  .search-switch-btn:hover { background: var(--srb-border-light); color: var(--srb-text); }
  .search-engine-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: var(--srb-z-dropdown);
    min-width: 130px;
    padding: 4px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-md);
    margin-top: 4px;
  }
  .search-engine-opt {
    display: flex;
    align-items: center;
    gap: var(--srb-space-sm);
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-medium);
    cursor: pointer;
    text-align: left;
    transition: background var(--srb-transition-fast);
  }
  .search-engine-opt:hover { background: var(--srb-menu-hover-bg); }
  .se-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--srb-radius-full);
    flex-shrink: 0;
  }
</style>
