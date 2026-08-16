<script lang="ts">
  type Toast = {
    id: number;
    message: string;
    tone?: 'success' | 'error';
  };

  let { toast = null }: { toast?: Toast | null } = $props();

  let visibleToast = $state<Toast | null>(null);
  let shownToastId = 0;

  $effect(() => {
    if (!toast || toast.id === shownToastId) return;

    shownToastId = toast.id;
    visibleToast = toast;
    const timeout = window.setTimeout(() => {
      if (visibleToast?.id === toast?.id) visibleToast = null;
    }, 3000);

    return () => window.clearTimeout(timeout);
  });
</script>

{#if visibleToast}
  <div class:toast-error={visibleToast.tone === 'error'} class="toast" role="status" aria-live="polite">
    {visibleToast.message}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    z-index: 10;
    right: var(--hush-space-xl);
    bottom: var(--hush-space-xl);
    max-width: min(360px, calc(100vw - 2 * var(--hush-space-xl)));
    padding: 10px 14px;
    border: 1px solid color-mix(in srgb, var(--hush-success-text) 25%, var(--hush-border));
    border-radius: var(--hush-radius-md);
    background: var(--hush-surface);
    box-shadow: var(--hush-shadow-md);
    color: var(--hush-success-text);
    font-size: var(--hush-font-size-sm);
    font-weight: var(--hush-weight-medium);
  }

  .toast-error {
    border-color: color-mix(in srgb, var(--hush-danger) 25%, var(--hush-border));
    color: var(--hush-danger);
  }

  @media (max-width: 580px) {
    .toast {
      right: var(--hush-space-lg);
      bottom: var(--hush-space-lg);
      max-width: calc(100vw - 2 * var(--hush-space-lg));
    }
  }
</style>
