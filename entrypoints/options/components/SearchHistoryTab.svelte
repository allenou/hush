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
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .search-section-heading {
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

  .search-table {
    border: 1px solid #e2e9e4;
    border-radius: 12px;
    overflow: hidden;
  }
  .search-table-head {
    display: grid;
    grid-template-columns: 1fr 80px 100px 120px;
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
  .search-table-row {
    display: grid;
    grid-template-columns: 1fr 80px 100px 120px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid #edf2ef;
    transition: background 0.12s;
  }
  .search-table-row:hover { background: #fafcfb; }
  .search-table-query {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #18211d;
  }
  .search-table-query .search-icon { color: #9aa8a1; flex-shrink: 0; }
  .search-engine-tag {
    padding: 2px 7px;
    border-radius: 999px;
    background: #eaf7f1;
    color: #0a7a55;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .search-table-time {
    font-size: 13px;
    color: #6d7f77;
  }
  .search-table-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .search-table-actions .btn-ghost {
    padding: 4px 10px;
    font-size: 12px;
  }
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
    border-radius: 4px;
    background: transparent;
    color: #9aa8a1;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .search-switch-btn:hover { background: #e2e9e4; color: #18211d; }
  .search-engine-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 20;
    min-width: 130px;
    padding: 4px;
    border: 1px solid #dde6e1;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 4px 16px rgba(24,33,29,0.12);
    margin-top: 4px;
  }
  .search-engine-opt {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #18211d;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }
  .search-engine-opt:hover { background: #f0f5f2; }
  .se-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
