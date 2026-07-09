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
    backupStatus = '',
    onExportBackup,
    onImportBackup,
  }: {
    blockAds?: boolean;
    blockSubdomains?: boolean;
    recordSearchHistory?: boolean;
    onToggleAdBlock?: () => void;
    onToggleSubdomain?: () => void;
    onToggleRecordSearch?: () => void;
    currentLocale?: string;
    onLocaleChange?: (locale: string) => void;
    backupStatus?: string;
    onExportBackup?: () => void | Promise<void>;
    onImportBackup?: (file: File) => void | Promise<void>;
  } = $props();

  let backupInput: HTMLInputElement | null = null;

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

  function handleExportBackup() {
    void onExportBackup?.();
  }

  function handleImportClick() {
    backupInput?.click();
  }

  function handleBackupFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void onImportBackup?.(file);
    input.value = '';
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
    <h2 class="card-title">{t('backupLabel')}</h2>
    <p class="card-desc">{t('backupDesc')}</p>
  </div>
  <div class="backup-actions">
    <button class="backup-btn primary" onclick={handleExportBackup}>
      {t('backupExport')}
    </button>
    <button class="backup-btn" onclick={handleImportClick}>
      {t('backupImport')}
    </button>
    <input
      bind:this={backupInput}
      class="backup-input"
      type="file"
      accept="application/json,.json"
      onchange={handleBackupFileChange}
    />
  </div>
  {#if backupStatus}
    <p class="backup-status">{backupStatus}</p>
  {/if}
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
    max-width: var(--srb-settings-width);
    margin: 0 auto;
    padding: var(--srb-space-2xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .method-card + .method-card {
    margin-top: var(--srb-space-lg);
  }
  .method-heading {
    margin-bottom: var(--srb-space-lg);
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

  .toggle-list {
    border-top: 1px solid var(--srb-divider);
  }
  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--srb-divider);
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
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
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
    width: var(--srb-toggle-width);
    height: var(--srb-toggle-height);
    border-radius: var(--srb-radius-full);
    background: var(--srb-toggle-off);
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: var(--srb-engine-google);
  }
  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: var(--srb-toggle-thumb-size);
    height: var(--srb-toggle-thumb-size);
    border-radius: var(--srb-radius-full);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-sm);
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(18px);
  }

  .locale-selector {
    display: flex;
    gap: var(--srb-space-sm);
    margin-top: 4px;
  }
  .backup-actions {
    display: flex;
    gap: var(--srb-space-sm);
  }
  .backup-btn {
    flex: 1;
    min-height: var(--srb-button-height);
    padding: 10px 16px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
    transition: all var(--srb-transition-base);
  }
  .backup-btn:hover {
    border-color: var(--srb-engine-google);
    background: var(--srb-success-light);
  }
  .backup-btn.primary {
    border-color: var(--srb-engine-google);
    background: var(--srb-engine-google);
    color: var(--srb-on-primary);
  }
  .backup-btn.primary:hover {
    background: var(--srb-primary-hover);
  }
  .backup-input {
    display: none;
  }
  .backup-status {
    margin: var(--srb-space-sm) 0 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
  }
  .locale-btn {
    flex: 1;
    padding: 10px 16px;
    border: 2px solid var(--srb-border);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    cursor: pointer;
    transition: all var(--srb-transition-base);
  }
  .locale-btn:hover {
    border-color: var(--srb-engine-google);
    background: var(--srb-success-light);
  }
  .locale-btn.active {
    border-color: var(--srb-engine-google);
    background: var(--srb-engine-google);
    color: var(--srb-on-primary);
  }
</style>
