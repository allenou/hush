import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/entrypoints/options/components/Dashboard.svelte';
import { setLocale } from '@/utils/locale';
import { t } from '@/utils/locale-store.svelte';
import type { BlockStats } from '@/utils/storage';

vi.mock('@/utils/chart', () => ({
  Chart: class {
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

  it('defaults to 7 days and switches the range total to 30 days', async () => {
    const target = render();
    const thirtyDayButton = [...target.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('30'));

    expect(thirtyDayButton).toBeDefined();
    expect(thirtyDayButton?.getAttribute('aria-pressed')).toBe('false');
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('7');

    thirtyDayButton?.click();
    await tick();

    expect(thirtyDayButton?.getAttribute('aria-pressed')).toBe('true');
    expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('30');
  });

  it('renders a concise total-blocked data hub with inline units', async () => {
    await setLocale('zh_CN');
    const target = render({
      totalBlockCount: 128,
      todayBlockCount: 6,
      totalCount: 12,
    });

    const total = target.querySelector('.dash-hero-total');
    const heroMain = target.querySelector('.dash-hero-main');
    const watermark = target.querySelector('.dash-hero-watermark');
    const metrics = target.querySelectorAll('.dash-hero-metric');
    const kpis = target.querySelectorAll('.kpi-card');
    const kpiUnits = target.querySelectorAll('.kpi-unit');

    expect(total?.textContent).toContain('128');
    expect(total?.querySelector('.dash-hero-unit')?.textContent?.trim()).not.toBe('');
    expect(heroMain?.contains(watermark)).toBe(true);
    expect(metrics).toHaveLength(2);
    expect(metrics[0]?.textContent).toContain('6');
    expect(metrics[1]?.textContent).toContain('12');
    expect(metrics[0]?.querySelector('span')?.textContent?.trim()).toBe(t('today'));
    expect(metrics[1]?.querySelector('span')?.textContent?.trim()).toBe(t('tabRules'));
    expect(target.querySelectorAll('.dash-page-heading p, .dash-card-heading p')).toHaveLength(0);
    expect(kpis).toHaveLength(3);
    expect(kpiUnits).toHaveLength(3);
    expect(kpiUnits[0]?.textContent?.trim()).toBe(t('times'));
    expect(kpiUnits[1]?.textContent?.trim()).toBe(t('perDayUnit'));
    expect(kpiUnits[2]?.textContent?.trim()).toBe(t('times'));
  });

  it('renders accessible trend, breakdown, and domain charts when domain data exists', async () => {
    const target = render({
      topBlockedDomains: [
        { domain: 'example.com', count: 8 },
        { domain: 'news.example', count: 3 },
      ],
    });
    await tick();

    const canvases = target.querySelectorAll('canvas');
    const detailGrid = target.querySelector('.detail-grid');
    expect(canvases).toHaveLength(3);
    expect(detailGrid).not.toBeNull();
    expect(detailGrid?.querySelectorAll('canvas')).toHaveLength(3);
    for (const canvas of canvases) {
      expect(canvas.getAttribute('aria-label')?.trim()).not.toBe('');
      expect(detailGrid?.contains(canvas)).toBe(true);
    }
  });

  it('shows an empty domain state and omits only the domain chart', async () => {
    const target = render({ topBlockedDomains: [] });
    await tick();

    expect(target.querySelector('.dash-empty')).not.toBeNull();
    expect(target.querySelectorAll('canvas')).toHaveLength(2);
  });

  it('limits rendered domain details to ten and preserves each full domain in its title', async () => {
    const domains = Array.from({ length: 12 }, (_, index) => ({
      domain: `very-long-domain-${index}.example.com`,
      count: 20 - index,
    }));
    const target = render({ topBlockedDomains: domains });
    await tick();

    const labels = target.querySelectorAll<HTMLElement>('.domain-values code');
    expect(labels).toHaveLength(10);
    expect(labels[0]?.textContent).toBe(domains[0].domain);
    expect(labels[0]?.getAttribute('title')).toBe(domains[0].domain);
  });

  it('shows a readable empty overlay for a zero-value breakdown without removing its canvas', async () => {
    const target = render({
      totalBlockCount: 0,
      adBlockCount: 0,
      domainBlockCount: 0,
      topBlockedDomains: [],
    });
    await tick();

    const breakdown = target.querySelector('.breakdown-card');
    const overlay = breakdown?.querySelector('.chart-empty-overlay');
    expect(breakdown?.querySelector('canvas')).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent?.trim()).not.toBe('');
  });
});
