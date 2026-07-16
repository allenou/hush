<script lang="ts">
  import { t } from '@/utils/locale-store.svelte';

  let {
    blockAds = false,
    blockSubdomains = true,
    recordSearchHistory = true,
    onToggleAdBlock,
    onToggleSubdomain,
    onToggleRecordSearch,
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
    backupStatus?: string;
    onExportBackup?: () => void | Promise<void>;
    onImportBackup?: (file: File) => void | Promise<void>;
  } = $props();

  let backupInput: HTMLInputElement | null = null;

  function handleBackupFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void onImportBackup?.(file);
    input.value = '';
  }
</script>

<div class="settings-page">
  <section class="settings-card wide" aria-labelledby="matching-heading">
    <div class="card-heading">
      <h2 id="matching-heading">{t('matchingMethod')}</h2>
    </div>

    <div class="setting-list">
      <label class="setting-row">
        <span class="setting-copy">
          <strong>{t('adBlockLabel')}</strong>
          <span>{t('adBlockDesc')}</span>
        </span>
        <span class="toggle">
          <input data-testid="ad-block-toggle" type="checkbox" checked={blockAds} onchange={() => onToggleAdBlock?.()} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </span>
      </label>

      <label class="setting-row">
        <span class="setting-copy">
          <strong>{t('subdomainLabel')}</strong>
          <span>{t('subdomainDesc')}</span>
        </span>
        <span class="toggle">
          <input data-testid="subdomain-toggle" type="checkbox" checked={blockSubdomains} onchange={() => onToggleSubdomain?.()} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </span>
      </label>
    </div>
  </section>

  <section class="settings-card wide" aria-labelledby="history-heading">
    <div class="card-heading">
      <h2 id="history-heading">{t('searchRecordLabel')}</h2>
    </div>

    <label class="setting-row compact-row">
      <span class="setting-copy">
        <strong>{t('recordSearchLabel')}</strong>
        <span>{t('recordSearchDesc')}</span>
      </span>
      <span class="toggle">
        <input data-testid="search-history-toggle" type="checkbox" checked={recordSearchHistory} onchange={() => onToggleRecordSearch?.()} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </span>
    </label>
  </section>

  <section class="settings-card wide backup-card" aria-labelledby="backup-heading">
    <div class="backup-content">
      <div class="card-heading backup-heading">
        <div>
          <h2 id="backup-heading">{t('backupLabel')}</h2>
          <p>{t('backupDesc')}</p>
        </div>
      </div>

      {#if backupStatus}
        <p class="backup-status" role="status">{backupStatus}</p>
      {/if}
    </div>

    <div class="backup-actions">
      <button class="backup-btn" onclick={() => backupInput?.click()}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V5m0 0 4 4m-4-4L8 9M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {t('backupImport')}
      </button>
      <button class="backup-btn primary" onclick={() => void onExportBackup?.()}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 18.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {t('backupExport')}
      </button>
      <input
        bind:this={backupInput}
        class="backup-input"
        type="file"
        accept="application/json,.json"
        onchange={handleBackupFileChange}
      />
    </div>
  </section>
</div>

<style>
  .settings-page {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--srb-space-lg);
    width: 100%;
  }
  .settings-card {
    min-width: 0;
    padding: var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .settings-card.wide { grid-column: 1 / -1; }
  .card-heading {
    display: flex;
    align-items: center;
    margin-bottom: var(--srb-space-lg);
  }
  .card-heading h2 {
    margin: 0;
    color: var(--srb-text-strong);
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--srb-line-height-tight);
  }
  .card-heading p {
    margin: 4px 0 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
  }
  .setting-list { border-top: 1px solid var(--srb-divider); }
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-lg);
    min-height: 68px;
    padding: 14px 2px;
    border-bottom: 1px solid var(--srb-divider);
    cursor: pointer;
  }
  .setting-row:last-child { border-bottom: 0; }
  .compact-row {
    min-height: 72px;
    padding: 12px 2px 0;
    border-top: 1px solid var(--srb-divider);
    border-bottom: 0;
  }
  .setting-copy strong,
  .setting-copy span { display: block; }
  .setting-copy strong {
    color: var(--srb-text);
    font-size: 15px;
    font-weight: var(--srb-weight-semibold);
  }
  .setting-copy span {
    margin-top: 3px;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
  }
  .toggle {
    position: relative;
    display: flex;
    flex: 0 0 auto;
  }
  .toggle input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .toggle-track {
    position: relative;
    display: block;
    width: var(--srb-toggle-width);
    height: var(--srb-toggle-height);
    border-radius: var(--srb-radius-full);
    background: var(--srb-toggle-off);
    transition: background var(--srb-transition-base), box-shadow var(--srb-transition-base);
  }
  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: var(--srb-toggle-thumb-size);
    height: var(--srb-toggle-thumb-size);
    border-radius: var(--srb-radius-full);
    background: var(--srb-surface);
    box-shadow: 0 0 0 1px rgba(41, 39, 38, 0.12), var(--srb-shadow-sm);
    transition: transform var(--srb-transition-base);
  }
  .toggle input:checked + .toggle-track { background: var(--srb-accent-hover); }
  .toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }
  .toggle input:focus-visible + .toggle-track { box-shadow: var(--srb-focus-ring); }

  .backup-btn:focus-visible {
    outline: none;
    box-shadow: var(--srb-focus-ring);
  }

  .backup-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-2xl);
  }
  .backup-content { min-width: 0; }
  .backup-heading { margin-bottom: 0; }
  .backup-status {
    margin: var(--srb-space-sm) 0 0;
    color: var(--srb-success-text);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .backup-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--srb-space-sm);
  }
  .backup-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: var(--srb-button-height);
    padding: 10px 16px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
    white-space: nowrap;
    cursor: pointer;
    transition: border-color var(--srb-transition-base), background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .backup-btn svg { width: 16px; height: 16px; }
  .backup-btn:hover {
    border-color: var(--srb-accent);
    background: var(--srb-accent-soft);
    color: var(--srb-primary);
  }
  .backup-btn.primary {
    border-color: var(--srb-primary-action);
    background: var(--srb-primary-action);
    color: var(--srb-on-primary);
  }
  .backup-btn.primary:hover {
    border-color: var(--srb-primary-action-hover);
    background: var(--srb-primary-action-hover);
    color: var(--srb-on-primary);
  }
  .backup-input { display: none; }

  @media (max-width: 820px) {
    .settings-page { grid-template-columns: 1fr; }
    .settings-card.wide { grid-column: auto; }
    .backup-card { align-items: flex-start; flex-direction: column; }
  }

  @media (max-width: 520px) {
    .settings-card { padding: var(--srb-space-lg); }
    .backup-actions { width: 100%; flex-wrap: wrap; }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-track,
    .toggle-thumb,
    .backup-btn { transition: none; }
  }
</style>
