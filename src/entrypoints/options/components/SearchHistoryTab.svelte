<script lang="ts">
  import type { SearchRecord } from '@/utils/storage';
  import { SEARCH_ENGINES } from '@/constants';
  import { formatRelativeTime } from '@/utils/time';
  import { getLocale, getSearchEngineDisplayName, t } from '@/utils/locale-store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { searchHistory = [], recordSearchHistory = false, onSearch, onRemove, onClear, onOpenSettings } = $props<{
    searchHistory: SearchRecord[];
    recordSearchHistory?: boolean;
    onSearch?: (detail: { record: SearchRecord; engineHostname?: string }) => void;
    onRemove?: (index: number) => void;
    onClear?: () => void;
    onOpenSettings?: () => void;
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
    <div class="search-heading-copy">
      <h2 class="card-title">{t('searchHistory')}</h2>
      {#if recordSearchHistory}
        <p class="search-recording-notice">{t('searchHistoryRecordingNotice')}</p>
      {/if}
    </div>
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
      {#if recordSearchHistory}
        <p>{t('noHistoryDesc')}</p>
      {:else}
        <p class="empty-settings-message">
          {t('noHistoryDisabledDesc')}
          {#if getLocale() === 'en'}{' '}{/if}
          <button type="button" class="empty-settings-link" onclick={() => onOpenSettings?.()}>{t('settingsPageTitle')}</button>
          {t('enableHistoryInSettings')}
        </p>
      {/if}
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
            <span class="search-engine-tag">
              {getSearchEngineDisplayName(record.engineHostname, record.engineName)}
            </span>
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
                        <span>{getSearchEngineDisplayName(engine.hostname, engine.label)}</span>
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
    border: 1px solid var(--hush-border);
    border-radius: var(--hush-radius-card);
    background: var(--hush-surface);
    padding: var(--hush-space-xl);
    box-shadow: var(--hush-shadow-xs);
  }
  .search-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hush-space-md);
    margin-bottom: 16px;
  }
  .search-heading-copy { min-width: 0; }
  .search-recording-notice {
    margin: var(--hush-space-2xs) 0 0;
    color: var(--hush-text-secondary);
    font-size: var(--hush-font-size-xs);
    line-height: var(--hush-line-height-body);
  }
  .history-clear {
    border: none;
    background: transparent;
    color: var(--hush-danger);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-semibold);
    cursor: pointer;
  }
  .card-title {
    margin: 0;
    font-size: var(--hush-font-size-title);
    font-weight: var(--hush-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--hush-line-height-tight);
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
  .empty-settings-link {
    padding: 0;
    border: 0;
    background: linear-gradient(transparent 62%, var(--hush-accent-highlight) 62%);
    color: var(--hush-primary);
    font: inherit;
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    transition: color var(--hush-transition-fast);
  }
  .empty-settings-link:hover {
    color: var(--hush-primary-hover);
  }
  .empty-settings-link:focus-visible {
    outline: none;
    box-shadow: var(--hush-focus-ring);
  }

  .search-table {
    border: 1px solid var(--hush-border-light);
    border-radius: 12px;
    overflow: visible;
  }
  .search-table-head {
    display: grid;
    grid-template-columns: 1fr 80px 100px 200px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: var(--hush-table-head);
    color: var(--hush-text-secondary);
    font-size: var(--hush-font-size-xs);
    font-weight: var(--hush-weight-bold);
    letter-spacing: var(--hush-tracking-caps);
    text-transform: uppercase;
    border-radius: 11px 11px 0 0;
  }
  .search-table-row {
    display: grid;
    grid-template-columns: 1fr 80px 100px 200px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--hush-row-divider);
    transition: background var(--hush-transition-fast);
  }
  .search-table-row:last-child { border-radius: 0 0 11px 11px; }
  .search-table-row:hover { background: var(--hush-row-hover); }
  .search-table-query {
    display: flex;
    align-items: center;
    gap: var(--hush-space-sm);
    font-size: var(--hush-font-size-body);
    font-weight: var(--hush-weight-semibold);
    color: var(--hush-text);
  }
  .search-table-query .search-icon { color: var(--hush-text-muted); flex-shrink: 0; }
  .search-engine-tag {
    padding: 2px 7px;
    border-radius: var(--hush-radius-full);
    background: var(--hush-accent-soft);
    color: var(--hush-domain-text);
    font-size: var(--hush-font-size-2xs);
    font-weight: var(--hush-weight-bold);
    letter-spacing: var(--hush-tracking-label);
  }
  .search-table-time {
    font-size: var(--hush-font-size-sm);
    color: var(--hush-text-subtle);
  }
  .search-table-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hush-space-sm);
  }
  .search-action-group {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--hush-border-strong);
    border-radius: var(--hush-radius-md);
    background: var(--hush-surface);
    overflow: visible;
  }
  .search-again-btn,
  .history-delete {
    font: inherit;
    font-size: var(--hush-font-size-xs);
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    transition: background var(--hush-transition-fast), color var(--hush-transition-fast);
  }
  .search-again-btn {
    padding: 5px 9px;
    border: none;
    border-radius: calc(var(--hush-radius-md) - 1px) 0 0 calc(var(--hush-radius-md) - 1px);
    background: transparent;
    color: var(--hush-text-neutral);
  }
  .search-again-btn:hover {
    background: var(--hush-accent-soft);
    color: var(--hush-text-strong);
  }
  .history-delete {
    padding: 5px 8px;
    border: none;
    border-radius: var(--hush-radius-md);
    background: transparent;
    color: var(--hush-text-subtle);
  }
  .history-delete:hover {
    background: var(--hush-danger-soft-bg);
    color: var(--hush-danger);
  }
  .search-again-btn:focus-visible,
  .search-switch-btn:focus-visible,
  .history-delete:focus-visible,
  .search-engine-opt:focus-visible {
    outline: none;
    box-shadow: var(--hush-focus-ring);
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
    border-left: 1px solid var(--hush-border-strong);
    border-radius: 0 calc(var(--hush-radius-md) - 1px) calc(var(--hush-radius-md) - 1px) 0;
    background: transparent;
    color: var(--hush-text-muted);
    cursor: pointer;
    transition: background var(--hush-transition-fast), color var(--hush-transition-fast);
  }
  .search-switch-btn:hover { background: var(--hush-accent-soft); color: var(--hush-text); }
  .search-engine-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: var(--hush-z-dropdown);
    min-width: 130px;
    padding: 4px;
    border: 1px solid var(--hush-border);
    border-radius: var(--hush-radius-lg);
    background: var(--hush-surface);
    box-shadow: var(--hush-shadow-md);
    margin-top: 4px;
  }
  .search-engine-opt {
    display: flex;
    align-items: center;
    gap: var(--hush-space-sm);
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--hush-text);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-medium);
    cursor: pointer;
    text-align: left;
    transition: background var(--hush-transition-fast);
  }
  .search-engine-opt:hover { background: var(--hush-menu-hover-bg); }
  .search-engine-opt.current {
    background: var(--hush-accent-soft);
    font-weight: var(--hush-weight-bold);
  }
  .se-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--hush-radius-full);
    flex-shrink: 0;
  }
  .current-engine-check {
    margin-left: auto;
    color: var(--hush-primary);
  }
</style>
