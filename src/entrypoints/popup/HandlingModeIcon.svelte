<script lang="ts">
  import type { TemporaryHandlingMode } from '@/utils/temporary-blocking';

  let {
    mode,
    size = 10,
  }: {
    mode: TemporaryHandlingMode;
    size?: number;
  } = $props();
</script>

<svg
  class="handling-mode-icon"
  class:mode-off={mode === 'off'}
  viewBox="0 0 16 16"
  style={`width: ${size}px; height: ${size}px`}
  aria-hidden="true"
  focusable="false"
>
  {#if mode === 'mark'}
    <path d="m3 12 .5-2.6 6.3-6.3 2.2 2.2-6.3 6.3L3 12Z"></path>
    <path d="m8.8 4.1 2.2 2.2"></path>
  {:else if mode === 'hide'}
    <circle cx="8" cy="8" r="5.25"></circle>
    <path d="m4.3 4.3 7.4 7.4"></path>
  {:else}
    <path d="M5.25 4v8M10.75 4v8"></path>
  {/if}
</svg>

<style>
  .handling-mode-icon {
    display: block;
    box-sizing: border-box;
    flex: 0 0 auto;
    overflow: visible;
    color: var(--metric-color, currentColor);
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
  }
  .handling-mode-icon.mode-off {
    color: var(--hush-text-muted);
    stroke-width: 2;
  }
</style>
