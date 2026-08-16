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
    z-index: var(--hush-z-dialog);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--hush-space-xl);
    background: var(--hush-overlay);
    backdrop-filter: blur(2px);
  }
  .dialog {
    width: min(400px, 100%);
    padding: var(--hush-space-2xl);
    border-radius: var(--hush-radius-dialog);
    background: var(--hush-surface);
    box-shadow: var(--hush-shadow-dialog);
  }
  h2 {
    margin: 0 0 var(--hush-space-sm);
    font-size: var(--hush-font-size-title);
    font-weight: var(--hush-weight-bold);
    line-height: var(--hush-line-height-tight);
  }
  p {
    margin: 0;
    color: var(--hush-text-subtle);
    font-size: var(--hush-font-size-body);
    line-height: var(--hush-line-height-body);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--hush-space-sm);
    margin-top: var(--hush-space-2xl);
  }
  .dialog-actions button {
    height: var(--hush-button-height-compact);
    padding: 0 16px;
    border-radius: var(--hush-radius-lg);
    font: inherit;
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-bold);
    cursor: pointer;
    transition: background var(--hush-transition-base), border-color var(--hush-transition-base);
  }
  .btn-cancel {
    border: 1px solid var(--hush-border-strong);
    background: var(--hush-surface);
    color: var(--hush-text-secondary);
  }
  .btn-cancel:hover {
    background: var(--hush-control-hover-bg);
  }
  .btn-cancel:focus-visible {
    outline: none;
    box-shadow: var(--hush-focus-ring);
  }
  .btn-danger {
    border: 1px solid var(--hush-danger);
    background: var(--hush-danger);
    color: var(--hush-on-primary);
  }
  .btn-danger:hover {
    border-color: var(--hush-danger-strong);
    background: var(--hush-danger-strong);
  }
  .btn-danger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--hush-danger-ring);
  }
</style>
