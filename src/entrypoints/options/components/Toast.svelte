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
    right: var(--srb-space-xl);
    bottom: var(--srb-space-xl);
    max-width: min(360px, calc(100vw - 2 * var(--srb-space-xl)));
    padding: 10px 14px;
    border: 1px solid color-mix(in srgb, var(--srb-success-text) 25%, var(--srb-border));
    border-radius: var(--srb-radius-md);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-md);
    color: var(--srb-success-text);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-medium);
  }

  .toast-error {
    border-color: color-mix(in srgb, var(--srb-danger) 25%, var(--srb-border));
    color: var(--srb-danger);
  }

  @media (max-width: 580px) {
    .toast {
      right: var(--srb-space-lg);
      bottom: var(--srb-space-lg);
      max-width: calc(100vw - 2 * var(--srb-space-lg));
    }
  }
</style>
