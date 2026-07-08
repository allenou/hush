<script lang="ts">
  import { t } from '@/utils/locale-store.svelte';

  let {
    blockAds = false,
    blockSubdomains = true,
    recordSearchHistory = true,
    onToggleAdBlock,
    onToggleSubdomain,
    onToggleRecordSearch,
    currentLocale = 'zh_CN',
    onLocaleChange,
  }: {
    blockAds?: boolean;
    blockSubdomains?: boolean;
    recordSearchHistory?: boolean;
    onToggleAdBlock?: () => void;
    onToggleSubdomain?: () => void;
    onToggleRecordSearch?: () => void;
    currentLocale?: string;
    onLocaleChange?: (locale: string) => void;
  } = $props();

  const LOCALE_OPTIONS = [
    { value: 'zh_CN', label: '中文' },
    { value: 'en', label: 'English' },
  ];

  function handleToggleAdBlock() {
    onToggleAdBlock?.();
  }

  function handleToggleSubdomain() {
    onToggleSubdomain?.();
  }

  function handleToggleRecordSearch() {
    onToggleRecordSearch?.();
  }

  function handleLocaleSelect(locale: string) {
    onLocaleChange?.(locale);
  }
</script>

<div class="method-card">
  <div class="method-heading">
    <h2 class="card-title">{t('matchingMethod')}</h2>
    <p class="card-desc">{t('matchingDesc')}</p>
  </div>
  <div class="toggle-list">
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>{t('adBlockLabel')}</strong>
        <p>{t('adBlockDesc')}</p>
      </div>
      <label class="toggle" aria-label={t('toggleAdBlock')}>
        <input type="checkbox" checked={blockAds} onchange={handleToggleAdBlock} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>{t('subdomainLabel')}</strong>
        <p>{t('subdomainDesc')}</p>
      </div>
      <label class="toggle" aria-label={t('toggleSubdomain')}>
        <input type="checkbox" checked={blockSubdomains} onchange={handleToggleSubdomain} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
  </div>
</div>

<div class="method-card">
  <div class="method-heading">
    <h2 class="card-title">{t('searchRecordLabel')}</h2>
    <p class="card-desc">{t('searchRecordDesc')}</p>
  </div>
  <div class="toggle-list">
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>{t('recordSearchLabel')}</strong>
        <p>{t('recordSearchDesc')}</p>
      </div>
      <label class="toggle" aria-label={t('toggleRecordSearch')}>
        <input type="checkbox" checked={recordSearchHistory} onchange={handleToggleRecordSearch} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
  </div>
</div>

<div class="method-card">
  <div class="method-heading">
    <h2 class="card-title">Language / 语言</h2>
    <p class="card-desc">{t('languageDesc')}</p>
  </div>
  <div class="locale-selector">
    {#each LOCALE_OPTIONS as { value, label }}
      <button
        class="locale-btn"
        class:active={currentLocale === value}
        onclick={() => handleLocaleSelect(value)}
      >
        {label}
      </button>
    {/each}
  </div>
</div>

<style>
  .method-card {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .method-card + .method-card {
    margin-top: 16px;
  }
  .method-heading {
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

  .toggle-list {
    border-top: 1px solid #ecf1ee;
  }
  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid #ecf1ee;
  }
  .toggle-item:last-child {
    border-bottom: none;
  }
  .toggle-copy strong {
    display: block;
    font-size: 15px;
    margin-bottom: 2px;
  }
  .toggle-copy p {
    margin: 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }
  .toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-track {
    position: relative;
    width: 44px;
    height: 26px;
    border-radius: 999px;
    background: #cfd8d3;
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: #0d8f66;
  }
  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(18px);
  }

  .locale-selector {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .locale-btn {
    flex: 1;
    padding: 10px 16px;
    border: 2px solid #dde6e1;
    border-radius: 10px;
    background: #fff;
    color: #18211d;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .locale-btn:hover {
    border-color: #0d8f66;
    background: #f0fdf4;
  }
  .locale-btn.active {
    border-color: #0d8f66;
    background: #0d8f66;
    color: #fff;
  }
</style>
