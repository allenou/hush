<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart } from '@/utils/chart';
  import type { ChartConfiguration } from 'chart.js';

  interface ChartInstance {
    data?: ChartConfiguration['data'];
    options?: ChartConfiguration['options'];
    update(): void;
    destroy(): void;
  }

  type ChartFactory = (
    canvas: HTMLCanvasElement,
    configuration: ChartConfiguration,
  ) => ChartInstance;

  interface Props {
    ariaLabel: string;
    configuration: ChartConfiguration;
    factory?: ChartFactory;
  }

  function createChart(
    canvas: HTMLCanvasElement,
    configuration: ChartConfiguration,
  ): ChartInstance {
    return new Chart(canvas, configuration);
  }

  let { ariaLabel, configuration, factory = createChart }: Props = $props();
  let canvas: HTMLCanvasElement;
  let instance = $state.raw<ChartInstance>();
  let mounted = $state(false);
  let currentConfiguration: ChartConfiguration | undefined;

  function destroyInstance(): void {
    const currentInstance = instance;
    instance = undefined;

    try {
      currentInstance?.destroy();
    } catch {
      // Chart.js 销毁失败不应中断组件生命周期
    }
  }

  function createInstance(nextConfiguration: ChartConfiguration): void {
    try {
      instance = factory(canvas, nextConfiguration);
    } catch {
      instance = undefined;
    } finally {
      currentConfiguration = nextConfiguration;
    }
  }

  function pluginsChanged(
    previousPlugins: ChartConfiguration['plugins'],
    nextPlugins: ChartConfiguration['plugins'],
  ): boolean {
    const previous = previousPlugins ?? [];
    const next = nextPlugins ?? [];

    return previous.length !== next.length
      || previous.some((plugin, index) => plugin !== next[index]);
  }

  function requiresRecreation(
    previous: ChartConfiguration,
    next: ChartConfiguration,
  ): boolean {
    return previous.type !== next.type || pluginsChanged(previous.plugins, next.plugins);
  }

  onMount(() => {
    mounted = true;
    createInstance(configuration);

    return () => {
      mounted = false;
      destroyInstance();
      currentConfiguration = undefined;
    };
  });

  $effect(() => {
    const nextConfiguration = configuration;

    if (!mounted || nextConfiguration === currentConfiguration) return;

    const previousConfiguration = currentConfiguration;

    if (
      !instance
      || !previousConfiguration
      || requiresRecreation(previousConfiguration, nextConfiguration)
    ) {
      destroyInstance();
      createInstance(nextConfiguration);
      return;
    }

    try {
      instance.data = nextConfiguration.data;
      instance.options = nextConfiguration.options ?? {};
      instance.update();
      currentConfiguration = nextConfiguration;
    } catch {
      destroyInstance();
      createInstance(nextConfiguration);
    }
  });
</script>

<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<canvas bind:this={canvas} role="img" aria-label={ariaLabel}></canvas>
