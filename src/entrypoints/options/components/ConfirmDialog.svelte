<script lang="ts">
  let {
    show = false,
    title = '',
    message = '',
    confirmLabel = '',
    cancelLabel = '',
    onConfirm,
    onClose,
  }: {
    show?: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onClose?: () => void;
  } = $props();

  let cancelButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (show) queueMicrotask(() => cancelButton?.focus());
  });

  function onWindowKeydown(event: KeyboardEvent) {
    if (show && event.key === 'Escape') onClose?.();
  }

  function onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose?.();
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if show}
  <div class="overlay" role="presentation" onclick={onBackdropClick}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div class="dialog-actions">
        <button bind:this={cancelButton} class="btn-cancel" onclick={() => onClose?.()}>{cancelLabel}</button>
        <button class="btn-danger" onclick={() => onConfirm?.()}>{confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--srb-z-dialog);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--srb-space-xl);
    background: var(--srb-overlay);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: min(400px, 100%);
    padding: var(--srb-space-2xl);
    border-radius: var(--srb-radius-dialog);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-dialog);
  }
  h2 {
    margin: 0 0 var(--srb-space-sm);
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    line-height: var(--srb-line-height-tight);
  }
  p {
    margin: 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-body);
    line-height: var(--srb-line-height-body);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--srb-space-sm);
    margin-top: var(--srb-space-2xl);
  }
  .dialog-actions button {
    height: var(--srb-button-height-compact);
    padding: 0 16px;
    border-radius: var(--srb-radius-lg);
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-bold);
    cursor: pointer;
    transition: background var(--srb-transition-base), border-color var(--srb-transition-base);
  }
  .btn-cancel {
    border: 1px solid var(--srb-border-strong);
    background: var(--srb-surface);
    color: var(--srb-text-secondary);
  }
  .btn-cancel:hover {
    background: var(--srb-control-hover-bg);
  }
  .btn-cancel:focus-visible {
    outline: none;
    box-shadow: var(--srb-focus-ring);
  }
  .btn-danger {
    border: 1px solid var(--srb-danger);
    background: var(--srb-danger);
    color: var(--srb-on-primary);
  }
  .btn-danger:hover {
    border-color: var(--srb-danger-strong);
    background: var(--srb-danger-strong);
  }
  .btn-danger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--srb-danger-ring);
  }
</style>
