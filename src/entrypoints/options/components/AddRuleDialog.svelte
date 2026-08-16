<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '@/utils/locale-store.svelte';

  let {
    show = false,
    errorMsg = '',
    onClose,
    onAdd,
  }: {
    show?: boolean;
    errorMsg?: string;
    onClose?: () => void;
    onAdd?: (value: string) => void;
  } = $props();

  let localInput = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);

  onMount(() => {
    if (show) inputEl?.focus();
  });

  function handleAdd() {
    if (!localInput.trim()) return;
    onAdd?.(localInput.trim());
    localInput = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') handleAdd();
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }
</script>

{#if show}
  <div class="overlay" role="presentation" onclick={onBackdropClick}>
    <div class="dialog" role="dialog" aria-labelledby="dialog-title">
      <div class="dialog-header">
        <div>
          <h2 id="dialog-title" class="card-title">{t('newRule')}</h2>
        </div>
        <button class="dialog-close" onclick={() => onClose?.()} aria-label={t('close')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="add-row">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={localInput}
          onkeydown={handleKeydown}
          placeholder={t('placeholderDomain')}
        />
        <button class="btn-primary" onclick={handleAdd}>{t('add')}</button>
      </div>
      {#if errorMsg}
        <p class="feedback error">{errorMsg}</p>
      {:else}
        <p class="feedback hint">{t('hintDomainUrl')}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--hush-z-dialog);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--hush-overlay);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: var(--hush-dialog-width);
    padding: var(--hush-space-2xl);
    border-radius: var(--hush-radius-dialog);
    background: var(--hush-surface);
    box-shadow: var(--hush-shadow-dialog);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--hush-space-md);
    margin-bottom: 18px;
  }
  .dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--hush-icon-button-size);
    height: var(--hush-icon-button-size);
    flex-shrink: 0;
    border: none;
    border-radius: var(--hush-radius-md);
    background: transparent;
    color: var(--hush-text-subtle);
    cursor: pointer;
    transition: background var(--hush-transition-fast), color var(--hush-transition-fast);
  }
  .dialog-close:hover {
    background: var(--hush-bg);
    color: var(--hush-text);
  }

  .card-title {
    margin: 0;
    font-size: var(--hush-font-size-title);
    font-weight: var(--hush-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--hush-line-height-tight);
  }
  .add-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--hush-space-sm);
  }
  .add-row input {
    width: 100%;
    height: var(--hush-input-height);
    padding: 0 14px;
    border: 1px solid var(--hush-border-strong);
    border-radius: var(--hush-radius-lg);
    background: var(--hush-surface);
    color: var(--hush-text);
    font: inherit;
    font-size: var(--hush-font-size-body);
    outline: none;
    transition: border-color var(--hush-transition-base), box-shadow var(--hush-transition-base);
  }
  .add-row input:focus {
    border-color: var(--hush-engine-google);
    box-shadow: var(--hush-focus-ring);
  }
  .btn-primary {
    height: var(--hush-button-height);
    padding: 0 22px;
    border: none;
    border-radius: var(--hush-radius-lg);
    background: var(--hush-primary-action);
    color: var(--hush-on-primary);
    font: inherit;
    font-size: var(--hush-font-size-body);
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--hush-transition-base);
  }
  .btn-primary:hover {
    background: var(--hush-primary-action-hover);
  }
  .btn-primary:active {
    background: var(--hush-primary-active);
  }

  .feedback {
    margin: 10px 0 0;
    font-size: var(--hush-font-size-sm);
    line-height: var(--hush-line-height-body);
  }
  .feedback.hint {
    color: var(--hush-text-subtle);
  }
  .feedback.error {
    color: var(--hush-danger);
    font-weight: var(--hush-weight-semibold);
  }
</style>
