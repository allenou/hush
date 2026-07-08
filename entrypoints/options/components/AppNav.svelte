<script lang="ts">
  import { TABS } from '../../../constants';
  import type { TabId } from '../../../constants';

  let { activeTab = 'dashboard' as TabId, onTabChange } = $props<{ activeTab: TabId; onTabChange?: (tab: TabId) => void }>();

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
        <span class="brand-label">Search Result Blocker</span>
      </div>
      <div class="nav-links">
        {#each TABS as { id, label }}
          <button class="nav-link" class:active={activeTab === id} onclick={() => switchTab(id)}>{label}</button>
        {/each}
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

<style>
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
</style>
