import { mount, tick, unmount } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChartCanvas from '@/components/ChartCanvas.svelte';
import { Chart } from '@/utils/chart';

describe('ChartCanvas', () => {
  const cleanups: Array<() => void | Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
    cleanups.length = 0;
    document.body.innerHTML = '';
  });

  function trackUnmount(component: ReturnType<typeof mount>): () => Promise<void> {
    let active = true;
    const cleanup = async () => {
      if (!active) return;
      active = false;
      await unmount(component);
    };
    cleanups.push(cleanup);
    return cleanup;
  }

  function trackLegacy(component: { $destroy(): void }): void {
    let active = true;
    cleanups.push(() => {
      if (!active) return;
      active = false;
      component.$destroy();
    });
  }

  it('registers the Chart.js components required by supported charts', () => {
    expect(Chart.registry.getController('line')).toBeDefined();
    expect(Chart.registry.getController('bar')).toBeDefined();
    expect(Chart.registry.getController('doughnut')).toBeDefined();
    expect(Chart.registry.getScale('category')).toBeDefined();
    expect(Chart.registry.getScale('linear')).toBeDefined();
    expect(Chart.registry.getElement('arc')).toBeDefined();
    expect(Chart.registry.getElement('bar')).toBeDefined();
    expect(Chart.registry.getElement('line')).toBeDefined();
    expect(Chart.registry.getElement('point')).toBeDefined();
    expect(Chart.registry.getPlugin('tooltip')).toBeDefined();
    expect(Chart.registry.getPlugin('legend')).toBeDefined();
    expect(Chart.registry.getPlugin('filler')).toBeDefined();
  });

  it('creates an accessible chart and destroys it when unmounted', async () => {
    const update = vi.fn();
    const destroy = vi.fn();
    const factory = vi.fn(() => ({ update, destroy }));
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(ChartCanvas, {
      target,
      props: {
        ariaLabel: '近七天屏蔽趋势',
        configuration: {
          type: 'line',
          data: { labels: [], datasets: [] },
        },
        factory,
      },
    });
    const cleanup = trackUnmount(component);
    await tick();

    const canvas = target.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('近七天屏蔽趋势');
    expect(factory).toHaveBeenCalledTimes(1);

    await cleanup();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('updates chart data and options when the configuration changes', async () => {
    const update = vi.fn();
    const destroy = vi.fn();
    const initialConfiguration = {
      type: 'line' as const,
      data: { labels: ['周一'], datasets: [{ data: [1] }] },
      options: { responsive: true },
    };
    const chart = {
      data: initialConfiguration.data,
      options: initialConfiguration.options,
      update,
      destroy,
    };
    const factory = vi.fn(() => chart);
    const target = document.createElement('div');

    const component = createClassComponent({
      component: ChartCanvas,
      target,
      props: {
        ariaLabel: '近七天屏蔽趋势',
        configuration: initialConfiguration,
        factory,
      },
    });
    trackLegacy(component);
    await tick();
    expect(update).not.toHaveBeenCalled();

    const nextConfiguration = {
      type: 'line' as const,
      data: { labels: ['周二'], datasets: [{ data: [2] }] },
      options: { responsive: false },
    };
    component.$set({ configuration: nextConfiguration });
    await tick();

    expect(chart.data).toBe(nextConfiguration.data);
    expect(chart.options).toBe(nextConfiguration.options);
    expect(update).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('recreates the chart when its type changes', async () => {
    const firstChart = {
      update: vi.fn(),
      destroy: vi.fn(),
    };
    const secondChart = {
      update: vi.fn(),
      destroy: vi.fn(),
    };
    const factory = vi.fn()
      .mockReturnValueOnce(firstChart)
      .mockReturnValueOnce(secondChart);
    const target = document.createElement('div');
    const component = createClassComponent({
      component: ChartCanvas,
      target,
      props: {
        ariaLabel: '统计图表',
        configuration: {
          type: 'line',
          data: { labels: [], datasets: [] },
        },
        factory,
      },
    });
    trackLegacy(component);
    await tick();

    component.$set({
      configuration: {
        type: 'bar',
        data: { labels: [], datasets: [] },
      },
    });
    await tick();

    expect(firstChart.destroy).toHaveBeenCalledTimes(1);
    expect(firstChart.update).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('retries chart creation after an earlier attempt fails', async () => {
    const chart = {
      update: vi.fn(),
      destroy: vi.fn(),
    };
    const factory = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error('canvas context unavailable');
      })
      .mockReturnValueOnce(chart);
    const target = document.createElement('div');
    const component = createClassComponent({
      component: ChartCanvas,
      target,
      props: {
        ariaLabel: '统计图表',
        configuration: {
          type: 'line',
          data: { labels: [], datasets: [] },
        },
        factory,
      },
    });
    trackLegacy(component);
    await tick();

    component.$set({
      configuration: {
        type: 'line',
        data: { labels: ['周二'], datasets: [{ data: [2] }] },
      },
    });
    await tick();

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('destroys and recreates the chart when updating throws', async () => {
    const firstChart = {
      data: { labels: ['周一'], datasets: [{ data: [1] }] },
      options: {},
      update: vi.fn(() => {
        throw new Error('update failed');
      }),
      destroy: vi.fn(),
    };
    const secondChart = {
      update: vi.fn(),
      destroy: vi.fn(),
    };
    const factory = vi.fn()
      .mockReturnValueOnce(firstChart)
      .mockReturnValueOnce(secondChart);
    const target = document.createElement('div');
    const component = createClassComponent({
      component: ChartCanvas,
      target,
      props: {
        ariaLabel: '统计图表',
        configuration: {
          type: 'line',
          data: { labels: ['周一'], datasets: [{ data: [1] }] },
        },
        factory,
      },
    });
    trackLegacy(component);
    await tick();

    component.$set({
      configuration: {
        type: 'line',
        data: { labels: ['周二'], datasets: [{ data: [2] }] },
      },
    });
    await tick();

    expect(firstChart.update).toHaveBeenCalledTimes(1);
    expect(firstChart.destroy).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('keeps the canvas mounted when chart creation fails', async () => {
    const factory = vi.fn(() => {
      throw new Error('canvas context unavailable');
    });
    const target = document.createElement('div');

    const component = mount(ChartCanvas, {
      target,
      props: {
        ariaLabel: '屏蔽类型分布',
        configuration: {
          type: 'doughnut',
          data: { labels: [], datasets: [] },
        },
        factory,
      },
    });
    trackUnmount(component);
    await tick();

    expect(target.querySelector('canvas')).not.toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
