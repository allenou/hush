<script lang="ts">
  import type { SearchRecord } from '@/utils/storage';
  import { SEARCH_ENGINES } from '@/constants';
  import { formatRelativeTime } from '@/utils/time';
  import { t } from '@/utils/locale-store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { searchHistory = [], onSearch, onRemove, onClear } = $props<{
    searchHistory: SearchRecord[];
    onSearch?: (detail: { record: SearchRecord; engineHostname?: string }) => void;
    onRemove?: (index: number) => void;
    onClear?: () => void;
  }>();

  let searchEngineMenus = $state<Record<number, boolean>>({});
  let showClearConfirm = $state(false);

  function toggleEngineMenu(index: number) {
    searchEngineMenus = { ...searchEngineMenus, [index]: !searchEngineMenus[index] };
  }

  function closeEngineMenu(index: number) {
    searchEngineMenus = { ...searchEngineMenus, [index]: false };
  }

  function doSearch(record: SearchRecord, engineHostname?: string) {
    onSearch?.({ record, engineHostname });
  }

  function confirmClearHistory() {
    showClearConfirm = false;
    onClear?.();
  }
</script>

<section class="search-section">
  <div class="search-section-heading">
    <h2 class="card-title">{t('searchHistory')}</h2>
    {#if searchHistory.length > 0}
      <button class="history-clear" onclick={() => showClearConfirm = true}>{t('clearHistory')}</button>
    {/if}
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
            <div class="search-action-group">
              <button class="search-again-btn" onclick={() => doSearch(record)}>{t('searchAction')}</button>
              <div class="search-switch-wrapper">
                <button
                  class="search-switch-btn"
                  aria-label={t('switchEngine')}
                  aria-haspopup="menu"
                  aria-expanded={searchEngineMenus[i] ?? false}
                  onclick={(e) => { e.stopPropagation(); toggleEngineMenu(i); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {#if searchEngineMenus[i]}
                  <div class="search-engine-menu" role="menu" tabindex="-1" onmouseleave={() => closeEngineMenu(i)}>
                    {#each SEARCH_ENGINES as engine}
                      <button
                        class:current={engine.hostname === record.engineHostname}
                        class="search-engine-opt"
                        role="menuitem"
                        aria-current={engine.hostname === record.engineHostname ? 'true' : undefined}
                        onclick={() => { doSearch(record, engine.hostname); closeEngineMenu(i); }}
                      >
                        <span class="se-dot" style="background:{engine.color}"></span>
                        <span>{engine.label}</span>
                        {#if engine.hostname === record.engineHostname}
                          <svg class="current-engine-check" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <button class="history-delete" onclick={() => onRemove?.(i)}>{t('deleteHistory')}</button>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<ConfirmDialog
  show={showClearConfirm}
  title={t('clearHistory')}
  message={t('clearHistoryConfirm')}
  confirmLabel={t('clearHistory')}
  cancelLabel={t('cancel')}
  onConfirm={confirmClearHistory}
  onClose={() => showClearConfirm = false}
/>

<style>
  .search-section {
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    padding: var(--srb-space-xl);
    box-shadow: var(--srb-shadow-xs);
  }
  .search-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-md);
    margin-bottom: 16px;
  }
  .history-clear {
    border: none;
    background: transparent;
    color: var(--srb-danger);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
  }
  .card-title {
    margin: 0;
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--srb-line-height-tight);
  }
  .empty {
    padding: var(--srb-space-4xl) var(--srb-space-2xl);
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
    overflow: visible;
  }
  .search-table-head {
    display: grid;
    grid-template-columns: 1fr 80px 100px 200px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: var(--srb-table-head);
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-caps);
    text-transform: uppercase;
    border-radius: 11px 11px 0 0;
  }
  .search-table-row {
    display: grid;
    grid-template-columns: 1fr 80px 100px 200px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--srb-row-divider);
    transition: background var(--srb-transition-fast);
  }
  .search-table-row:last-child { border-radius: 0 0 11px 11px; }
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
    justify-content: space-between;
    gap: var(--srb-space-sm);
  }
  .search-action-group {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--srb-border-strong);
    border-radius: var(--srb-radius-md);
    background: var(--srb-surface);
    overflow: visible;
  }
  .search-again-btn,
  .history-delete {
    font: inherit;
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    cursor: pointer;
    transition: background var(--srb-transition-fast), color var(--srb-transition-fast);
  }
  .search-again-btn {
    padding: 5px 9px;
    border: none;
    border-radius: calc(var(--srb-radius-md) - 1px) 0 0 calc(var(--srb-radius-md) - 1px);
    background: transparent;
    color: var(--srb-text-neutral);
  }
  .search-again-btn:hover {
    background: var(--srb-accent-soft);
    color: var(--srb-text-strong);
  }
  .history-delete {
    padding: 5px 8px;
    border: none;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-text-subtle);
  }
  .history-delete:hover {
    background: var(--srb-danger-soft-bg);
    color: var(--srb-danger);
  }
  .search-again-btn:focus-visible,
  .search-switch-btn:focus-visible,
  .history-delete:focus-visible,
  .search-engine-opt:focus-visible {
    outline: none;
    box-shadow: var(--srb-focus-ring);
  }

  .search-switch-wrapper {
    position: relative;
    display: flex;
  }
  .search-switch-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    min-height: 26px;
    border: none;
    border-left: 1px solid var(--srb-border-strong);
    border-radius: 0 calc(var(--srb-radius-md) - 1px) calc(var(--srb-radius-md) - 1px) 0;
    background: transparent;
    color: var(--srb-text-muted);
    cursor: pointer;
    transition: background var(--srb-transition-fast), color var(--srb-transition-fast);
  }
  .search-switch-btn:hover { background: var(--srb-accent-soft); color: var(--srb-text); }
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
  .search-engine-opt.current {
    background: var(--srb-accent-soft);
    font-weight: var(--srb-weight-bold);
  }
  .se-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--srb-radius-full);
    flex-shrink: 0;
  }
  .current-engine-check {
    margin-left: auto;
    color: var(--srb-primary);
  }
</style>
