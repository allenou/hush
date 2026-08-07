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
    blockSubdomains = true,
    recordSearchHistory = true,
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
  let modeMenuTarget = $state<DisplayModeTarget | null>(null);
  let pendingHideTarget = $state<DisplayModeTarget | null>(null);

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

  function modeValue(mode: AdDisplayMode, enabled: boolean): string {
    if (!enabled) return t('notProcess');
    return mode === 'mark' ? t('mark') : t('adDisplayModeHide');
  }

  function modeDescription(mode: AdDisplayMode, enabled: boolean): string {
    if (!enabled) return t('notProcessDesc');
    return mode === 'mark' ? t('adDisplayModeMarkDesc') : t('adDisplayModeHideDesc');
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
    if (mode === 'hide') {
      pendingHideTarget = target;
      return;
    }
    await applyDisplayMode(target, mode);
    await setTreatmentEnabled(target, true);
  }

  async function applyDisplayMode(target: DisplayModeTarget, mode: AdDisplayMode) {
    if (target === 'ad') await onAdDisplayModeChange?.(mode);
    else await onRuleDisplayModeChange?.(target, mode);
  }

  async function confirmHide() {
    if (pendingHideTarget) {
      await applyDisplayMode(pendingHideTarget, 'hide');
      await setTreatmentEnabled(pendingHideTarget, true);
    }
    pendingHideTarget = null;
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
        <div class="rule-groups" aria-label={t('treatmentTitle')}>
          <div class="rule-group" role="group" aria-label={t('adLabel')}>
            <strong class="rule-label">{t('adLabel')}</strong>
            <div class="mode-summary">
                <button class="mode-summary-button" data-testid="ad-display-mode-row" onclick={(event) => toggleModeMenu('ad', event)}>
                  <span>{modeDescription(adDisplayMode, blockAds)}</span>
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

          <div class="rule-group" role="group" aria-label={t('domainLabel')}>
            <strong class="rule-label">{t('domainLabel')}</strong>
            <div class="mode-summary">
              <button class="mode-summary-button" data-testid="domain-display-mode-row" onclick={(event) => toggleModeMenu('domain', event)}>
                <span>{modeDescription(domainDisplayMode, blockDomains)}</span>
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
            {#if blockDomains}
              <label class="subdomain-row" title={t('subdomainDesc')}>
                <span>{t('subdomainLabel')}</span>
                <span class="toggle compact-toggle">
                  <input data-testid="subdomain-toggle" type="checkbox" checked={blockSubdomains} onchange={() => onToggleSubdomain?.()} />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </span>
              </label>
            {/if}
          </div>

          <div class="rule-group" role="group" aria-label={t('filterUrl')}>
            <strong class="rule-label">{t('filterUrl')}</strong>
            <div class="mode-summary">
                <button class="mode-summary-button" data-testid="url-display-mode-row" onclick={(event) => toggleModeMenu('url', event)}>
                  <span>{modeDescription(urlDisplayMode, blockUrls)}</span>
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
                  <span>{modeDescription(selectorDisplayMode, blockSelectors)}</span>
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
  show={pendingHideTarget !== null}
  title={t('localHideConfirmTitle')}
  message={t('localHideConfirmMessage')}
  confirmLabel={t('adHideConfirmAction')}
  cancelLabel={t('cancel')}
  onConfirm={() => void confirmHide()}
  onClose={() => pendingHideTarget = null}
/>

<style>
  .settings-page {
    width: 100%;
    max-width: 1120px;
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
  .rule-groups { margin-top: var(--srb-space-sm); }
  .rule-group {
    padding: 10px 0;
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
    margin-top: 7px;
  }
  .mode-summary-button,
  .subdomain-row {
    display: flex;
    width: 100%;
    min-height: 30px;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-lg);
    padding: 0;
    border: 0;
    border: 0;
    background: transparent;
    color: var(--srb-text-subtle);
    font: inherit;
    font-size: var(--srb-font-size-xs);
    line-height: 1.45;
    text-align: left;
    cursor: pointer;
  }
  .mode-summary-button:hover { color: var(--srb-text); }
  .mode-summary-button:focus-visible,
  .subdomain-row:has(input:focus-visible) { outline: none; box-shadow: var(--srb-focus-ring); }
  .mode-value {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    color: var(--srb-primary);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-medium);
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
    top: calc(100% - 3px);
    right: 0;
    width: 116px;
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
  .subdomain-row { margin-top: 2px; }
  .subdomain-row > span:first-child { color: var(--srb-text-secondary); }
  .subdomain-row .toggle {
    flex: 0 0 auto;
  }
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
  .data-item-danger strong { color: var(--srb-danger-strong); }
  .backup-actions { display: flex; flex: 0 0 auto; gap: var(--srb-space-xs); }
  .backup-input { display: none; }
  .backup-btn,
  .reset-settings-btn,
  .clear-data-btn {
    min-height: 32px;
    padding: 5px 2px;
    border: 0;
    border-radius: var(--srb-radius-sm);
    background: transparent;
    font: inherit;
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-semibold);
    white-space: nowrap;
    cursor: pointer;
    transition: border-color var(--srb-transition-base), background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .backup-btn { color: var(--srb-primary); }
  .backup-btn:hover { background: var(--srb-accent-soft); }
  .reset-settings-btn { flex: 0 0 auto; color: var(--srb-text-secondary); }
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
  .clear-data-btn { flex: 0 0 auto; color: var(--srb-danger); }
  .clear-data-btn:hover { background: var(--srb-danger-light); color: var(--srb-danger-strong); }
  .backup-btn:focus-visible,
  .reset-settings-btn:focus-visible,
  .clear-data-btn:focus-visible { outline: none; box-shadow: var(--srb-focus-ring); }
  @media (max-width: 580px) {
    .settings-section,
    .secondary-section,
    .side-section { padding: var(--srb-space-lg); }
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
