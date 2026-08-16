<script lang="ts">
  import { TABS } from '@/constants';
  import type { TabId } from '@/constants';
  import { t } from '@/utils/locale-store.svelte';

  let {
    activeTab = 'dashboard' as TabId,
    currentLocale = 'zh_CN',
    onTabChange,
    onLocaleChange,
  } = $props<{
    activeTab: TabId;
    currentLocale?: string;
    onTabChange?: (tab: TabId) => void;
    onLocaleChange?: (locale: string) => void;
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

  function toggleLocale() {
    onLocaleChange?.(currentLocale === 'zh_CN' ? 'en' : 'zh_CN');
  }
</script>

<nav class="nav">
  <div class="nav-inner">
    <div class="nav-left">
      <div class="nav-brand">
        <img class="brand-icon" src="/icons/icon-32.png" alt="" aria-hidden="true" />
        <span class="brand-label">Hush</span>
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
      <button
        class="locale-switcher"
        aria-label={currentLocale === 'zh_CN' ? 'Switch to English' : '切换到中文'}
        title={currentLocale === 'zh_CN' ? 'Switch to English' : '切换到中文'}
        onclick={toggleLocale}
      >{currentLocale === 'zh_CN' ? '中' : 'EN'}</button>
    </div>
  </div>
</nav>

<style>
  .nav {
    background: var(--hush-surface);
    border-bottom: 1px solid var(--hush-border);
    box-shadow: var(--hush-shadow-xs);
    padding: 0 var(--hush-options-page-gutter);
    position: sticky;
    top: 0;
    z-index: var(--hush-z-nav);
  }
  .nav-inner {
    min-width: 0;
    max-width: var(--hush-options-max-width);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--hush-nav-height);
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
    gap: var(--hush-space-sm);
    color: var(--hush-primary);
    font-size: 15px;
    font-weight: var(--hush-weight-bold);
    letter-spacing: -0.01em;
  }
  .brand-icon {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }
  .brand-label { color: var(--hush-text-strong); white-space: nowrap; }
  .nav-links {
    min-width: 0;
    display: flex;
    gap: var(--hush-space-2xs);
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
    border-radius: var(--hush-radius-md);
    background: transparent;
    color: var(--hush-text-muted);
    font: inherit;
    font-size: var(--hush-font-size-body);
    font-weight: var(--hush-weight-semibold);
    cursor: pointer;
    transition: background var(--hush-transition-base), color var(--hush-transition-base);
  }
  .nav-link:hover { color: var(--hush-text-strong); background: var(--hush-control-hover-bg); }
  .nav-link.active { color: var(--hush-text-strong); background: var(--hush-nav-active-bg); }
  .nav-right { display: flex; flex-shrink: 0; align-items: center; gap: 12px; }
  .locale-switcher {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    padding: 0;
    border: 1px solid var(--hush-border);
    border-radius: var(--hush-radius-full);
    background: var(--hush-surface);
    color: var(--hush-text-muted);
    font: inherit;
    font-size: 11px;
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    transition: border-color var(--hush-transition-base), background var(--hush-transition-base), color var(--hush-transition-base), box-shadow var(--hush-transition-base);
  }
  .locale-switcher:hover {
    border-color: var(--hush-primary);
    background: var(--hush-accent-soft);
    color: var(--hush-primary);
  }
  .locale-switcher:focus-visible {
    outline: none;
    box-shadow: var(--hush-focus-ring);
  }
  @media (max-width: 760px) {
    .nav-left { gap: var(--hush-space-lg); }
    .nav-link { padding: 8px 12px; }
  }

  @media (max-width: 560px) {
    .nav-right { gap: var(--hush-space-sm); }
  }

  @media (max-width: 420px) {
    .nav-left { gap: var(--hush-space-sm); }
    .brand-label { display: none; }
    .nav-link { padding-inline: 10px; }
    .locale-switcher { flex-shrink: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .locale-switcher { transition: none; }
  }
</style>
