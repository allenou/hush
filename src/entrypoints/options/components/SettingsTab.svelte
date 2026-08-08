<script lang="ts">
  import { t } from '@/utils/locale-store.svelte';
  import type { AdDisplayMode, RuleDisplayModeTarget } from '@/utils/storage';
  import ConfirmDialog from './ConfirmDialog.svelte';

  type DisplayModeTarget = RuleDisplayModeTarget | 'ad';
  type HandlingMode = AdDisplayMode | 'off';

  let {
    blockAds = false,
    blockDomains = true,
    blockUrls = true,
    blockSelectors = true,
    adDisplayMode = 'mark',
    domainDisplayMode = 'mark',
    urlDisplayMode = 'mark',
    selectorDisplayMode = 'mark',
    blockSubdomains = false,
    recordSearchHistory = false,
    onToggleAdBlock,
    onToggleRuleEnabled,
    onAdDisplayModeChange,
    onRuleDisplayModeChange,
    onToggleSubdomain,
    onToggleRecordSearch,
    onExportBackup,
    onImportBackup,
    onClearAllData,
    onResetPageHandling,
  }: {
    blockAds?: boolean;
    blockDomains?: boolean;
    blockUrls?: boolean;
    blockSelectors?: boolean;
    adDisplayMode?: AdDisplayMode;
    domainDisplayMode?: AdDisplayMode;
    urlDisplayMode?: AdDisplayMode;
    selectorDisplayMode?: AdDisplayMode;
    blockSubdomains?: boolean;
    recordSearchHistory?: boolean;
    onToggleAdBlock?: () => void;
    onToggleRuleEnabled?: (target: RuleDisplayModeTarget) => void;
    onAdDisplayModeChange?: (mode: AdDisplayMode) => void;
    onRuleDisplayModeChange?: (target: RuleDisplayModeTarget, mode: AdDisplayMode) => void;
    onToggleSubdomain?: () => void;
    onToggleRecordSearch?: () => void;
    onExportBackup?: () => void | Promise<void>;
    onImportBackup?: (file: File) => void | Promise<void>;
    onClearAllData?: () => void | Promise<void>;
    onResetPageHandling?: () => void | Promise<void>;
  } = $props();

  let backupInput: HTMLInputElement | null = null;
  let showClearDataConfirm = $state(false);
  let showResetPageHandlingConfirm = $state(false);
  let showAdHideConfirm = $state(false);
  let modeMenuTarget = $state<DisplayModeTarget | null>(null);

  function handleBackupFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void onImportBackup?.(file);
    input.value = '';
  }

  async function confirmClearAllData() {
    await onClearAllData?.();
    showClearDataConfirm = false;
  }

  async function confirmResetPageHandling() {
    await onResetPageHandling?.();
    showResetPageHandlingConfirm = false;
  }

  async function confirmAdHide() {
    await applyDisplayMode('ad', 'hide');
    await setTreatmentEnabled('ad', true);
    showAdHideConfirm = false;
  }

  function modeValue(mode: AdDisplayMode, enabled: boolean): string {
    if (!enabled) return t('notProcess');
    return mode === 'mark' ? t('mark') : t('adDisplayModeHide');
  }

  function isTreatmentEnabled(target: DisplayModeTarget): boolean {
    if (target === 'ad') return blockAds;
    if (target === 'domain') return blockDomains;
    if (target === 'url') return blockUrls;
    return blockSelectors;
  }

  async function setTreatmentEnabled(target: DisplayModeTarget, enabled: boolean) {
    if (isTreatmentEnabled(target) === enabled) return;
    if (target === 'ad') await onToggleAdBlock?.();
    else await onToggleRuleEnabled?.(target);
  }

  function toggleModeMenu(target: DisplayModeTarget, event: MouseEvent) {
    event.stopPropagation();
    modeMenuTarget = modeMenuTarget === target ? null : target;
  }

  async function changeDisplayMode(target: DisplayModeTarget, mode: HandlingMode) {
    modeMenuTarget = null;
    if (mode === 'off') {
      await setTreatmentEnabled(target, false);
      return;
    }
    if (target === 'ad' && mode === 'hide') {
      showAdHideConfirm = true;
      return;
    }
    await applyDisplayMode(target, mode);
    await setTreatmentEnabled(target, true);
  }

  async function applyDisplayMode(target: DisplayModeTarget, mode: AdDisplayMode) {
    if (target === 'ad') await onAdDisplayModeChange?.(mode);
    else await onRuleDisplayModeChange?.(target, mode);
  }

  function onWindowClick() {
    modeMenuTarget = null;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') modeMenuTarget = null;
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="settings-page">
  <div class="settings-layout">
    <div class="settings-main">
      <section class="settings-section" aria-labelledby="page-handling-heading">
        <div class="page-handling-heading">
          <h2 id="page-handling-heading">{t('pageHandlingTitle')}</h2>
          <button type="button" class="reset-settings-btn" title={t('resetPageHandlingDesc')} onclick={() => showResetPageHandlingConfirm = true}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 5" /><path d="M19 4v4h-4" /></svg>
            {t('reset')}
          </button>
        </div>
        <p class="page-handling-notice">{t('pageHandlingNotice')}</p>
        <div class="rule-groups" aria-label={t('treatmentTitle')}>
          <div class="rule-group" role="group" aria-label={t('adLabel')}>
            <strong class="rule-label">{t('adLabel')}</strong>
            <div class="mode-summary">
                <button class="mode-summary-button" data-testid="ad-display-mode-row" onclick={(event) => toggleModeMenu('ad', event)}>
                  <span class="mode-value">{modeValue(adDisplayMode, blockAds)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3" /></svg></span>
                </button>
                {#if modeMenuTarget === 'ad'}
                  <div class="mode-menu" aria-label={t('adDisplayModeLabel')}>
                    <button data-mode="off" aria-pressed={!blockAds} onclick={() => void changeDisplayMode('ad', 'off')}>{t('notProcess')}{#if !blockAds}<span>✓</span>{/if}</button>
                    <button data-mode="mark" aria-pressed={blockAds && adDisplayMode === 'mark'} onclick={() => void changeDisplayMode('ad', 'mark')}>{t('mark')}{#if blockAds && adDisplayMode === 'mark'}<span>✓</span>{/if}</button>
                    <button data-mode="hide" aria-pressed={blockAds && adDisplayMode === 'hide'} onclick={() => void changeDisplayMode('ad', 'hide')}>{t('adDisplayModeHide')}{#if blockAds && adDisplayMode === 'hide'}<span>✓</span>{/if}</button>
                  </div>
                {/if}
            </div>
          </div>

          <div class="rule-group rule-group-domain" role="group" aria-label={t('domainLabel')}>
            <strong class="rule-label">{t('domainLabel')}</strong>
            <div class="domain-controls">
              {#if blockDomains}
                <label class="inline-subdomain-control" title={t('subdomainDesc')}>
                  <span>{t('subdomainLabel')}</span>
                  <span class="toggle compact-toggle">
                    <input data-testid="subdomain-toggle" type="checkbox" checked={blockSubdomains} onchange={() => onToggleSubdomain?.()} />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  </span>
                </label>
                <span class="domain-controls-divider" aria-hidden="true"></span>
              {/if}
              <div class="mode-summary">
                <button class="mode-summary-button" data-testid="domain-display-mode-row" onclick={(event) => toggleModeMenu('domain', event)}>
                  <span class="mode-value">{modeValue(domainDisplayMode, blockDomains)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3" /></svg></span>
                </button>
                {#if modeMenuTarget === 'domain'}
                  <div class="mode-menu" aria-label={t('domainDisplayModeLabel')}>
                    <button data-mode="off" aria-pressed={!blockDomains} onclick={() => void changeDisplayMode('domain', 'off')}>{t('notProcess')}{#if !blockDomains}<span>✓</span>{/if}</button>
                    <button data-mode="mark" aria-pressed={blockDomains && domainDisplayMode === 'mark'} onclick={() => void changeDisplayMode('domain', 'mark')}>{t('mark')}{#if blockDomains && domainDisplayMode === 'mark'}<span>✓</span>{/if}</button>
                    <button data-mode="hide" aria-pressed={blockDomains && domainDisplayMode === 'hide'} onclick={() => void changeDisplayMode('domain', 'hide')}>{t('adDisplayModeHide')}{#if blockDomains && domainDisplayMode === 'hide'}<span>✓</span>{/if}</button>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <div class="rule-group" role="group" aria-label={t('filterUrl')}>
            <strong class="rule-label">{t('filterUrl')}</strong>
            <div class="mode-summary">
                <button class="mode-summary-button" data-testid="url-display-mode-row" onclick={(event) => toggleModeMenu('url', event)}>
                  <span class="mode-value">{modeValue(urlDisplayMode, blockUrls)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3" /></svg></span>
                </button>
                {#if modeMenuTarget === 'url'}
                  <div class="mode-menu" aria-label={t('urlDisplayModeLabel')}>
                    <button data-mode="off" aria-pressed={!blockUrls} onclick={() => void changeDisplayMode('url', 'off')}>{t('notProcess')}{#if !blockUrls}<span>✓</span>{/if}</button>
                    <button data-mode="mark" aria-pressed={blockUrls && urlDisplayMode === 'mark'} onclick={() => void changeDisplayMode('url', 'mark')}>{t('mark')}{#if blockUrls && urlDisplayMode === 'mark'}<span>✓</span>{/if}</button>
                    <button data-mode="hide" aria-pressed={blockUrls && urlDisplayMode === 'hide'} onclick={() => void changeDisplayMode('url', 'hide')}>{t('adDisplayModeHide')}{#if blockUrls && urlDisplayMode === 'hide'}<span>✓</span>{/if}</button>
                  </div>
                {/if}
            </div>
          </div>

          <div class="rule-group" role="group" aria-label={t('pageElementLabel')}>
            <strong class="rule-label">{t('pageElementLabel')}</strong>
            <div class="mode-summary">
                <button class="mode-summary-button" data-testid="selector-display-mode-row" onclick={(event) => toggleModeMenu('selector', event)}>
                  <span class="mode-value">{modeValue(selectorDisplayMode, blockSelectors)}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4 3 3 3-3" /></svg></span>
                </button>
                {#if modeMenuTarget === 'selector'}
                  <div class="mode-menu" aria-label={t('selectorDisplayModeLabel')}>
                    <button data-mode="off" aria-pressed={!blockSelectors} onclick={() => void changeDisplayMode('selector', 'off')}>{t('notProcess')}{#if !blockSelectors}<span>✓</span>{/if}</button>
                    <button data-mode="mark" aria-pressed={blockSelectors && selectorDisplayMode === 'mark'} onclick={() => void changeDisplayMode('selector', 'mark')}>{t('mark')}{#if blockSelectors && selectorDisplayMode === 'mark'}<span>✓</span>{/if}</button>
                    <button data-mode="hide" aria-pressed={blockSelectors && selectorDisplayMode === 'hide'} onclick={() => void changeDisplayMode('selector', 'hide')}>{t('adDisplayModeHide')}{#if blockSelectors && selectorDisplayMode === 'hide'}<span>✓</span>{/if}</button>
                  </div>
                {/if}
            </div>
          </div>
        </div>
      </section>
    </div>

    <aside class="settings-aside">
      <div class="settings-secondary-grid">
        <section class="secondary-section" aria-labelledby="privacy-heading">
          <div class="secondary-heading">
            <h2 id="privacy-heading">{t('privacyTitle')}</h2>
          </div>
          <p class="secondary-notice">{t('privacyNotice')}</p>
          <label class="feature-row" aria-description={t('recordSearchDesc')}>
            <span class="feature-copy"><strong>{t('recordSearchLabel')}</strong></span>
            <span class="toggle">
              <input data-testid="search-history-toggle" type="checkbox" checked={recordSearchHistory} onchange={() => onToggleRecordSearch?.()} />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </span>
          </label>
        </section>

        <section class="side-section data-section" aria-labelledby="data-heading">
          <div class="secondary-heading">
            <h2 id="data-heading">{t('dataTitle')}</h2>
          </div>
          <p class="secondary-notice">{t('dataNotice')}</p>

          <div class="data-list">
            <div class="data-item">
              <div class="data-item-copy"><strong>{t('backupLabel')}</strong></div>
              <div class="backup-actions">
                <button type="button" class="backup-btn" onclick={() => void onExportBackup?.()}>{t('backupExport')}</button>
                <button type="button" class="backup-btn" onclick={() => backupInput?.click()}>{t('backupImport')}</button>
                <input class="backup-input" bind:this={backupInput} type="file" accept="application/json,.json" onchange={handleBackupFileChange} />
              </div>
            </div>
            <div class="data-item data-item-danger">
              <div class="data-item-copy"><strong>{t('clearAllDataLabel')}</strong></div>
              <button type="button" class="clear-data-btn" title={t('clearAllDataDesc')} onclick={() => showClearDataConfirm = true}>{t('clearAllDataAction')}</button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
</div>

<ConfirmDialog
  show={showClearDataConfirm}
  title={t('clearAllDataLabel')}
  message={t('clearAllDataConfirm')}
  confirmLabel={t('clearAllDataAction')}
  cancelLabel={t('cancel')}
  onConfirm={confirmClearAllData}
  onClose={() => showClearDataConfirm = false}
/>

<ConfirmDialog
  show={showResetPageHandlingConfirm}
  title={t('resetPageHandlingLabel')}
  message={t('resetPageHandlingConfirm')}
  confirmLabel={t('resetPageHandlingAction')}
  cancelLabel={t('cancel')}
  onConfirm={confirmResetPageHandling}
  onClose={() => showResetPageHandlingConfirm = false}
/>

<ConfirmDialog
  show={showAdHideConfirm}
  title={t('adHideConfirmTitle')}
  message={t('adHideConfirmMessage')}
  confirmLabel={t('adHideConfirmAction')}
  cancelLabel={t('cancel')}
  onConfirm={confirmAdHide}
  onClose={() => showAdHideConfirm = false}
/>

<style>
  .settings-page {
    width: 100%;
    margin: 0 auto;
  }

  .settings-layout { display: grid; gap: var(--srb-space-xl); }
  .settings-main,
  .settings-aside { min-width: 0; }

  .settings-section {
    min-width: 0;
    padding: var(--srb-space-lg) var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .page-handling-heading h2,
  .secondary-heading h2 {
    margin: 0;
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
  }
  .page-handling-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-lg);
  }
  .page-handling-heading h2 { color: var(--srb-text-strong); }
  .page-handling-notice {
    margin: var(--srb-space-2xs) 0 0;
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    line-height: var(--srb-line-height-body);
  }
  .secondary-notice {
    margin: var(--srb-space-2xs) 0 0;
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    line-height: var(--srb-line-height-body);
  }

  .feature-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-xl);
    min-height: 46px;
    padding: 6px 0;
    cursor: pointer;
  }
  .feature-copy { min-width: 0; }
  .feature-copy strong { display: block; }
  .feature-copy strong,
  .data-item strong {
    color: var(--srb-text);
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
  }
  .rule-groups { margin-top: var(--srb-space-md); }
  .rule-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: var(--srb-space-xl);
    min-height: 54px;
    padding: 8px 0;
    border-top: 1px solid var(--srb-divider);
  }
  .rule-label {
    display: block;
    color: var(--srb-text);
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-semibold);
  }
  .mode-summary {
    position: relative;
    justify-self: end;
  }
  .mode-summary-button {
    display: flex;
    width: 132px;
    min-height: 38px;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-md);
    background: var(--srb-surface);
    color: var(--srb-text-secondary);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
    line-height: 1.45;
    text-align: right;
    cursor: pointer;
    box-shadow: var(--srb-shadow-xs);
    transition: border-color var(--srb-transition-base), box-shadow var(--srb-transition-base);
  }
  .domain-controls {
    display: flex;
    align-items: center;
    justify-self: end;
    gap: var(--srb-space-sm);
    min-width: 0;
  }
  .inline-subdomain-control {
    display: flex;
    align-items: center;
    gap: var(--srb-space-xs);
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
    line-height: 1.45;
    white-space: nowrap;
    cursor: pointer;
  }
  .domain-controls-divider {
    width: 1px;
    height: 20px;
    background: var(--srb-divider);
  }
  .mode-summary-button:hover { border-color: var(--srb-primary); }
  .mode-summary-button:focus-visible,
  .inline-subdomain-control:has(input:focus-visible) { outline: none; box-shadow: var(--srb-focus-ring); }
  .mode-value {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: var(--srb-space-sm);
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .mode-value svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }
  .mode-menu {
    position: absolute;
    z-index: 2;
    top: calc(100% + 3px);
    right: 0;
    width: 132px;
    overflow: hidden;
    padding: 3px;
    border: 1px solid var(--srb-border-light);
    border-radius: var(--srb-radius-md);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-md);
  }
  .mode-menu button {
    display: flex;
    width: 100%;
    min-height: 30px;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    border: 0;
    border-radius: var(--srb-radius-sm);
    background: transparent;
    color: var(--srb-text);
    font: inherit;
    font-size: var(--srb-font-size-xs);
    text-align: left;
    cursor: pointer;
  }
  .mode-menu button:hover { background: var(--srb-control-hover-bg); }
  .mode-menu button[aria-pressed="true"] { color: var(--srb-primary); font-weight: var(--srb-weight-semibold); }
  .mode-menu button:focus-visible { outline: none; box-shadow: var(--srb-focus-ring); }
  .compact-toggle .toggle-track {
    width: 34px;
    height: 20px;
  }
  .compact-toggle .toggle-thumb {
    width: 14px;
    height: 14px;
  }
  .toggle { position: relative; display: flex; flex: 0 0 auto; }
  .toggle input { position: absolute; width: 1px; height: 1px; opacity: 0; }
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
  .compact-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(14px); }
  .toggle input:focus-visible + .toggle-track { box-shadow: var(--srb-focus-ring); }

  .settings-secondary-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--srb-space-xl);
  }
  .secondary-section,
  .side-section {
    min-width: 0;
    padding: var(--srb-space-lg) var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .secondary-heading {
    display: flex;
    align-items: center;
    min-height: 28px;
    padding-bottom: 2px;
  }
  .secondary-heading h2 { color: var(--srb-text-strong); }
  .secondary-section .feature-row { margin-top: var(--srb-space-sm); }
  .data-list {
    margin-top: var(--srb-space-sm);
    border-top: 1px solid var(--srb-divider);
  }
  .data-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-sm);
    min-height: 46px;
    padding: 6px 0;
    border-bottom: 1px solid var(--srb-divider);
  }
  .data-item-copy { min-width: 0; }
  .data-item strong { display: block; word-break: normal; overflow-wrap: break-word; }
  .data-item-danger { border-bottom: 0; }
  .backup-actions { display: flex; flex: 0 0 auto; gap: var(--srb-space-xs); }
  .backup-input { display: none; }
  .backup-btn,
  .clear-data-btn {
    min-height: 34px;
    padding: 0 var(--srb-space-md);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-sm);
    background: var(--srb-surface);
    font: inherit;
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-semibold);
    white-space: nowrap;
    cursor: pointer;
    box-shadow: var(--srb-shadow-xs);
    transition: border-color var(--srb-transition-base), background var(--srb-transition-base), color var(--srb-transition-base), box-shadow var(--srb-transition-base);
  }
  .backup-btn { color: var(--srb-primary); }
  .backup-btn:hover { border-color: var(--srb-primary); background: var(--srb-accent-soft); }
  .reset-settings-btn {
    min-height: 32px;
    padding: 5px 2px;
    border: 0;
    border-radius: var(--srb-radius-sm);
    background: transparent;
    color: var(--srb-text-secondary);
    font: inherit;
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-semibold);
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .reset-settings-btn { flex: 0 0 auto; }
  .reset-settings-btn svg {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: -2px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .reset-settings-btn:hover { background: var(--srb-control-hover-bg); color: var(--srb-text); }
  .clear-data-btn { flex: 0 0 auto; border-color: var(--srb-danger-border); color: var(--srb-danger); }
  .clear-data-btn:hover { border-color: var(--srb-danger); background: var(--srb-danger-light); color: var(--srb-danger-strong); }
  .backup-btn:focus-visible,
  .reset-settings-btn:focus-visible,
  .clear-data-btn:focus-visible { outline: none; box-shadow: var(--srb-focus-ring); }
  @media (max-width: 580px) {
    .settings-section,
    .secondary-section,
    .side-section { padding: var(--srb-space-lg); }
    .rule-group-domain {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--srb-space-2xs);
    }
    .domain-controls { justify-self: end; }
    .data-item { align-items: flex-start; flex-wrap: wrap; }
    .backup-actions { margin-left: auto; }
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-track,
    .toggle-thumb,
    .backup-btn,
    .reset-settings-btn,
    .clear-data-btn { transition: none; }
  }
</style>
