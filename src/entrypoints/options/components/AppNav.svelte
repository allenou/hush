<script lang="ts">
  import { TABS } from '@/constants';
  import type { TabId } from '@/constants';
  import { t } from '@/utils/locale-store.svelte';

  let { activeTab = 'dashboard' as TabId, onTabChange } = $props<{ activeTab: TabId; onTabChange?: (tab: TabId) => void }>();

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
          <button class="nav-link" class:active={activeTab === id} onclick={() => switchTab(id)}>{tabLabel[id]}</button>
        {/each}
      </div>
    </div>
    <div class="nav-right">
      <span class="rule-badge">
        <span class="badge-dot"></span>
        {t('enabled')}
      </span>
    </div>
  </div>
</nav>

<style>
  .nav {
    background: var(--srb-primary);
    padding: 0 var(--srb-space-2xl);
    position: sticky;
    top: 0;
    z-index: var(--srb-z-nav);
  }
  .nav-inner {
    max-width: var(--srb-options-max-width);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--srb-nav-height);
  }
  .nav-left { display: flex; align-items: center; gap: 32px; }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: var(--srb-space-sm);
    color: var(--srb-on-primary);
    font-size: 15px;
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.01em;
  }
  .brand-label { white-space: nowrap; }
  .nav-links { display: flex; gap: var(--srb-space-2xs); }
  .nav-link {
    padding: 8px 16px;
    border: none;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-on-primary-muted);
    font: inherit;
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
    transition: background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .nav-link:hover { color: var(--srb-on-primary); background: var(--srb-on-primary-hover-bg); }
  .nav-link.active { color: var(--srb-on-primary); background: var(--srb-on-primary-active-bg); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .rule-badge {
    display: flex;
    align-items: center;
    gap: var(--srb-space-xs);
    padding: 6px 14px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-on-primary-badge-bg);
    color: var(--srb-on-primary-soft);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-success-dot);
    box-shadow: 0 0 0 2px var(--srb-success-dot-ring);
  }
</style>
