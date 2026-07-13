<script lang="ts">
  import { TABS } from '@/constants';
  import type { TabId } from '@/constants';
  import { t } from '@/utils/locale-store.svelte';

  let {
    activeTab = 'dashboard' as TabId,
    enabled = true,
    onTabChange,
  } = $props<{
    activeTab: TabId;
    enabled?: boolean;
    onTabChange?: (tab: TabId) => void;
  }>();

  let tabLabel = $derived<Record<TabId, string>>({
    dashboard: t('tabDashboard'),
    rules: t('tabRules'),
    search: t('tabSearch'),
    method: t('tabSettings'),
  });

  function switchTab(tab: TabId) {
    onTabChange?.(tab);
  }
</script>

<nav class="nav">
  <div class="nav-inner">
    <div class="nav-left">
      <div class="nav-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" opacity="0.2"/>
          <path d="M7 12l3 3 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="brand-label">SearchKit</span>
      </div>
      <div class="nav-links">
        {#each TABS as id}
          <button
            class="nav-link"
            class:active={activeTab === id}
            aria-current={activeTab === id ? 'page' : undefined}
            onclick={() => switchTab(id)}
          >{tabLabel[id]}</button>
        {/each}
      </div>
    </div>
    <div class="nav-right">
      <span class="rule-badge" class:disabled={!enabled}>
        <span class="badge-dot"></span>
        {t(enabled ? 'enabled' : 'disabled')}
      </span>
    </div>
  </div>
</nav>

<style>
  .nav {
    background: var(--srb-surface);
    border-bottom: 1px solid var(--srb-border);
    box-shadow: var(--srb-shadow-xs);
    padding: 0 var(--srb-space-2xl);
    position: sticky;
    top: 0;
    z-index: var(--srb-z-nav);
  }
  .nav-inner {
    min-width: 0;
    max-width: var(--srb-options-max-width);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--srb-nav-height);
  }
  .nav-left {
    min-width: 0;
    display: flex;
    flex: 1;
    align-items: center;
    gap: 32px;
    overflow: hidden;
  }
  .nav-brand {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--srb-space-sm);
    color: var(--srb-primary);
    font-size: 15px;
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.01em;
  }
  .brand-label { color: var(--srb-text-strong); white-space: nowrap; }
  .nav-links {
    min-width: 0;
    display: flex;
    gap: var(--srb-space-2xs);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .nav-links::-webkit-scrollbar { display: none; }
  .nav-link {
    position: relative;
    flex-shrink: 0;
    padding: 8px 16px;
    border: none;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-text-muted);
    font: inherit;
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
    transition: background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .nav-link:hover { color: var(--srb-text-strong); background: var(--srb-control-hover-bg); }
  .nav-link.active { color: var(--srb-text-strong); background: var(--srb-nav-active-bg); }
  .nav-right { display: flex; flex-shrink: 0; align-items: center; gap: 12px; }
  .rule-badge {
    display: flex;
    align-items: center;
    gap: var(--srb-space-xs);
    padding: 6px 14px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-status-bg);
    color: var(--srb-text-strong);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-primary);
    box-shadow: 0 0 0 2px var(--srb-accent-light);
  }
  .rule-badge.disabled {
    background: var(--srb-control-hover-bg);
    color: var(--srb-text-muted);
  }
  .rule-badge.disabled .badge-dot {
    background: var(--srb-text-muted);
    box-shadow: none;
  }

  @media (max-width: 760px) {
    .nav { padding: 0 var(--srb-space-lg); }
    .nav-left { gap: var(--srb-space-lg); }
    .nav-link { padding: 8px 12px; }
  }

  @media (max-width: 560px) {
    .nav-right { display: none; }
  }

  @media (max-width: 420px) {
    .nav { padding: 0 var(--srb-space-md); }
    .nav-left { gap: var(--srb-space-sm); }
    .brand-label { display: none; }
    .nav-link { padding-inline: 10px; }
  }
</style>
