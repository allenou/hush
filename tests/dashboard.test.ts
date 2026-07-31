import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/entrypoints/options/components/Dashboard.svelte';
import { setLocale } from '@/utils/locale';
import { t } from '@/utils/locale-store.svelte';
import type { BlockStats } from '@/utils/storage';

const chartMocks = vi.hoisted(() => ({
  instances: [] as Array<{
    type: string;
    data: {
      labels?: unknown[];
      datasets: Array<{ data: unknown[] }>;
    };
    options?: {
      onClick?: (event: unknown, elements: Array<{ index: number }>) => void;
    };
  }>,
}));

vi.mock('@/utils/chart', () => ({
  Chart: class {
    type: string;
    data: {
      labels?: unknown[];
      datasets: Array<{ data: unknown[] }>;
    };
    options?: {
      onClick?: (event: unknown, elements: Array<{ index: number }>) => void;
    };

    constructor(_canvas: HTMLCanvasElement, configuration: {
      type: string;
      data: {
        labels?: unknown[];
        datasets: Array<{ data: unknown[] }>;
      };
      options?: {
        onClick?: (event: unknown, elements: Array<{ index: number }>) => void;
      };
    }) {
      this.type = configuration.type;
      this.data = configuration.data;
      this.options = configuration.options;
      chartMocks.instances.push(this);
    }

    update(): void {}
    destroy(): void {}
  },
}));

const NOW = new Date(2026, 6, 13, 12);

function buildStats(days: number): BlockStats[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(2026, 6, 13 - (days - index - 1), 12);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return { date: key, count: 1 };
  });
}

describe('Dashboard', () => {
  let component: ReturnType<typeof mount> | undefined;

  afterEach(async () => {
    if (component) await unmount(component);
    component = undefined;
    chartMocks.instances.length = 0;
    document.body.innerHTML = '';
  });

  function render(props: Record<string, unknown> = {}): HTMLElement {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(Dashboard, {
      target,
      props: {
        dailyStats: buildStats(30),
        now: NOW,
        ...props,
      },
    });

    return target;
  }

  it('uses the chart x-axis as the only visible date-label source', () => {
    const target = render();

    expect(target.querySelector('.chart-date-axis')).toBeNull();
    expect(target.querySelectorAll('.chart-date-label')).toHaveLength(0);
  });

  it('defaults to 30 days and switches the range total from the dropdown', async () => {
    const target = render({ dailyStats: buildStats(365) });
    const rangeSelect = target.querySelector<HTMLSelectElement>('.range-select-shell select');

    expect(rangeSelect).not.toBeNull();
    expect(rangeSelect?.value).toBe('30');
    expect(rangeSelect?.options).toHaveLength(5);
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('30');

    rangeSelect!.value = '90';
    rangeSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(rangeSelect?.value).toBe('90');
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('90');
  });

  it('filters recent statistics by search engine beside the time range', async () => {
    const dailyStats = buildStats(30).map((item) => ({
      ...item,
      count: 3,
      engineStats: {
        'google.com': { count: 1 },
        'baidu.com': { count: 2 },
      },
    }));
    const target = render({ dailyStats });
    const engineSelect = target.querySelector<HTMLSelectElement>('.engine-select-shell select');

    expect(engineSelect).not.toBeNull();
    expect(engineSelect?.value).toBe('all');
    expect(engineSelect?.options).toHaveLength(9);
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('90');

    engineSelect!.value = 'google.com';
    engineSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('30');

    engineSelect!.value = 'baidu.com';
    engineSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('60');
  });

  it('renders a concise total-blocked data hub with inline units', async () => {
    await setLocale('zh_CN');
    const target = render({
      totalBlockCount: 1284,
      todayBlockCount: 6,
      totalCount: 12,
    });

    const total = target.querySelector('.dash-hero-total');
    const heroAccent = target.querySelector('.dash-hero-accent');
    const watermark = target.querySelector('.dash-hero-watermark');
    const metrics = target.querySelectorAll('.dash-hero-metric');
    const kpis = target.querySelectorAll('.kpi-card');
    const kpiUnits = target.querySelectorAll('.kpi-unit');

    expect(total?.textContent).toContain('1,284');
    expect(total?.querySelector('.dash-hero-unit')?.textContent?.trim()).not.toBe('');
    expect(heroAccent).toBeNull();
    expect(watermark).toBeNull();
    expect(metrics).toHaveLength(2);
    expect(metrics[0]?.textContent).toContain('6');
    expect(metrics[1]?.textContent).toContain('12');
    expect(metrics[0]?.querySelector('span')?.textContent?.trim()).toBe(t('today'));
    expect(metrics[1]?.querySelector('span')?.textContent?.trim()).toBe(t('tabRules'));
    expect(target.querySelector('.dash-page-heading')).toBeNull();
    expect(target.querySelectorAll('.range-toolbar p, .dash-card-heading p')).toHaveLength(0);
    expect(kpis).toHaveLength(3);
    expect(kpiUnits).toHaveLength(3);
    expect(kpiUnits[0]?.textContent?.trim()).toBe(t('times'));
    expect(kpiUnits[1]?.textContent?.trim()).toBe(t('perDayUnit'));
    expect(kpiUnits[2]?.textContent?.trim()).toBe(t('times'));
  });

  it('renders accessible trend, breakdown, and domain charts when domain data exists', async () => {
    const target = render({
      totalBlockCount: 12,
      adBlockCount: 4,
      domainBlockCount: 5,
      urlBlockCount: 2,
      selectorBlockCount: 1,
      topBlockedDomains: [
        { domain: 'example.com', count: 8 },
        { domain: 'news.example', count: 3 },
      ],
    });
    await tick();

    const canvases = target.querySelectorAll('canvas');
    const detailGrid = target.querySelector('.detail-grid');
    const rangeSection = target.querySelector('.range-section');
    const breakdownButtons = target.querySelectorAll('.breakdown-list button');
    const breakdownChart = chartMocks.instances.find((instance) => instance.type === 'doughnut');
    expect(canvases).toHaveLength(3);
    expect(detailGrid).not.toBeNull();
    expect(rangeSection?.querySelectorAll('canvas')).toHaveLength(1);
    expect(detailGrid?.querySelectorAll('canvas')).toHaveLength(2);
    expect(breakdownButtons).toHaveLength(4);
    expect(target.querySelector('.breakdown-list')?.textContent).toContain(t('filterUrl'));
    expect(target.querySelector('.breakdown-list')?.textContent).toContain(t('pageElementLabel'));
    expect(target.querySelector('.breakdown-list')?.textContent).not.toContain(t('legacyStatsLabel'));
    expect(breakdownChart?.data.datasets[0]?.data).toEqual([4, 5, 2, 1]);
    for (const canvas of canvases) {
      expect(canvas.getAttribute('aria-label')?.trim()).not.toBe('');
    }
  });

  it('shows an empty domain state and omits only the domain chart', async () => {
    const target = render({ topBlockedDomains: [] });
    await tick();

    expect(target.querySelector('.dash-empty')).not.toBeNull();
    expect(target.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('uses the chart as the only domain ranking representation', async () => {
    const domains = Array.from({ length: 12 }, (_, index) => ({
      domain: `very-long-domain-${index}.example.com`,
      count: 20 - index,
    }));
    const target = render({ topBlockedDomains: domains });
    await tick();

    expect(target.querySelector('.domains-card canvas')).not.toBeNull();
    expect(target.querySelector('.domain-values')).toBeNull();
  });

  it('links breakdown selections to the domain ranking', async () => {
    const target = render({
      totalBlockCount: 20,
      adBlockCount: 8,
      domainBlockCount: 9,
      urlBlockCount: 2,
      selectorBlockCount: 1,
      topBlockedDomains: [
        { domain: 'ads.example', count: 9, adCount: 8, domainCount: 1 },
        {
          domain: 'content.example',
          count: 11,
          adCount: 1,
          domainCount: 7,
          urlCount: 2,
          selectorCount: 1,
        },
      ],
    });
    await tick();

    const adButton = target.querySelector<HTMLButtonElement>('.breakdown-list button');
    expect(adButton?.getAttribute('aria-pressed')).toBe('false');
    expect(target.querySelector('[data-testid="domain-ranking-title"]')?.textContent)
      .toBe(t('topDomains'));

    adButton?.click();
    await tick();

    expect(adButton?.getAttribute('aria-pressed')).toBe('true');
    expect(target.querySelector('[data-testid="domain-ranking-title"]')?.textContent)
      .toBe(t('adDomainRanking'));
    expect(target.querySelector('.ranking-filter-pill')?.textContent).toContain(t('adLabel'));
    expect(target.querySelector('.domains-card canvas')).not.toBeNull();

    target.querySelector<HTMLButtonElement>('.ranking-filter-pill')?.click();
    await tick();

    expect(adButton?.getAttribute('aria-pressed')).toBe('false');
    expect(target.querySelector('[data-testid="domain-ranking-title"]')?.textContent)
      .toBe(t('topDomains'));
  });

  it('filters the domain ranking when a doughnut segment is clicked', async () => {
    const target = render({
      totalBlockCount: 20,
      adBlockCount: 8,
      domainBlockCount: 9,
      urlBlockCount: 2,
      selectorBlockCount: 1,
      topBlockedDomains: [
        { domain: 'ads.example', count: 9, adCount: 8, domainCount: 1 },
        {
          domain: 'content.example',
          count: 11,
          adCount: 1,
          domainCount: 7,
          urlCount: 2,
          selectorCount: 1,
        },
      ],
    });
    await tick();

    const breakdownChart = chartMocks.instances.find((instance) => instance.type === 'doughnut');
    const domainChart = chartMocks.instances.find((instance) => instance.type === 'bar');
    expect(breakdownChart?.options?.onClick).toBeTypeOf('function');

    breakdownChart?.options?.onClick?.({}, [{ index: 0 }]);
    await tick();

    expect(target.querySelector('[data-testid="domain-ranking-title"]')?.textContent)
      .toBe(t('adDomainRanking'));
    expect(domainChart?.data.labels).toEqual(['ads.example', 'content.example']);
    expect(domainChart?.data.datasets[0]?.data).toEqual([8, 1]);
  });

  it('omits empty charts and their legends', async () => {
    const target = render({
      dailyStats: [],
      totalBlockCount: 0,
      adBlockCount: 0,
      domainBlockCount: 0,
      urlBlockCount: 0,
      selectorBlockCount: 0,
      topBlockedDomains: [],
    });
    await tick();

    expect(target.querySelectorAll('canvas')).toHaveLength(0);
    expect(target.querySelector('.breakdown-list')).toBeNull();
    expect(target.querySelectorAll('.dash-empty')).toHaveLength(3);
  });
});
