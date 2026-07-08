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
          <p class="card-desc">{t('addRuleDesc')}</p>
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
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(24, 33, 29, 0.35);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: 460px;
    padding: 24px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 12px 40px rgba(24, 33, 29, 0.15);
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }
  .dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6d7f77;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .dialog-close:hover {
    background: #f4f7f5;
    color: #18211d;
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

  .add-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .add-row input {
    width: 100%;
    height: 42px;
    padding: 0 14px;
    border: 1px solid #ccd7d2;
    border-radius: 10px;
    background: #fff;
    color: #18211d;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .add-row input:focus {
    border-color: #0d8f66;
    box-shadow: 0 0 0 3px rgba(13, 143, 102, 0.12);
  }
  .btn-primary {
    height: 42px;
    padding: 0 22px;
    border: none;
    border-radius: 10px;
    background: #0c8d65;
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .btn-primary:hover {
    background: #087654;
  }
  .btn-primary:active {
    background: #066244;
  }

  .feedback {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.45;
  }
  .feedback.hint {
    color: #6d7f77;
  }
  .feedback.error {
    color: #c43d3d;
    font-weight: 600;
  }
</style>
