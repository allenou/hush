<script lang="ts">
  import ChartCanvas from '@/components/ChartCanvas.svelte';
  import { t } from '@/utils/locale-store.svelte';
  import { formatDate } from '@/utils/locale';
  import {
    buildBlockBreakdown,
    buildDailySeries,
    summarizeDailySeries,
    truncateDomainLabel,
  } from '@/utils/statistics';
  import type { BlockStats } from '@/utils/storage';
  import type { StatisticsRange } from '@/utils/statistics';
  import type { ChartConfiguration } from 'chart.js';

  interface DomainStat {
    domain: string;
    count: number;
  }

  interface Props {
    dailyStats?: BlockStats[];
    now?: Date;
    totalBlockCount?: number;
    todayBlockCount?: number;
    totalCount?: number;
    adBlockCount?: number;
    domainBlockCount?: number;
    topBlockedDomains?: DomainStat[];
  }

  let {
    dailyStats = [],
    now = new Date(),
    totalBlockCount = 0,
    todayBlockCount = 0,
    totalCount = 0,
    adBlockCount = 0,
    domainBlockCount = 0,
    topBlockedDomains = [],
  }: Props = $props();

  let rangeDays = $state<StatisticsRange>(7);
  let dailySeries = $derived(buildDailySeries(dailyStats, rangeDays, now));
  let summary = $derived(summarizeDailySeries(dailySeries));
  let visibleTopDomains = $derived(topBlockedDomains.slice(0, 10));
  let breakdown = $derived(buildBlockBreakdown(
    totalBlockCount,
    adBlockCount,
    domainBlockCount,
  ));
  let hasTrendData = $derived(summary.total > 0);
  let hasBreakdownData = $derived(
    breakdown.ads > 0 || breakdown.domains > 0 || breakdown.other > 0,
  );

  function parseDate(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00`);
  }

  function dateLabel(dateStr: string): string {
    return formatDate(parseDate(dateStr), {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  }

  function chartColor(property: string, fallback: string): string {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
      return fallback;
    }

    try {
      return getComputedStyle(document.documentElement).getPropertyValue(property).trim() || fallback;
    } catch {
      return fallback;
    }
  }

  let trendConfiguration = $derived.by((): ChartConfiguration<'line'> => {
    const teal = chartColor('--srb-primary', '#328f7e');
    const fill = chartColor('--srb-chart-teal-soft', 'rgba(50, 143, 126, 0.18)');

    return {
      type: 'line',
      data: {
        labels: dailySeries.map((item) => dateLabel(item.date)),
        datasets: [{
          label: t('dailyBlocks'),
          data: dailySeries.map((item) => item.count),
          borderColor: teal,
          backgroundColor: fill,
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: teal,
          pointBorderColor: chartColor('--srb-surface', '#ffffff'),
          pointBorderWidth: 2,
          pointRadius: rangeDays === 7 ? 4 : 2,
          pointHoverRadius: 5,
          tension: 0.32,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y ?? 0} ${t('times')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: rangeDays === 7 ? 7 : 8 },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: chartColor('--srb-border-light', '#eef0f5') },
          },
        },
      },
    };
  });

  let breakdownConfiguration = $derived.by((): ChartConfiguration<'doughnut'> => ({
    type: 'doughnut',
    data: {
      labels: [t('adLabel'), t('domainLabel'), t('otherLabel')],
      datasets: [{
        data: [breakdown.ads, breakdown.domains, breakdown.other],
        backgroundColor: [
          chartColor('--srb-primary', '#328f7e'),
          chartColor('--srb-accent', '#9fdd60'),
          chartColor('--srb-chart-purple', '#898beb'),
        ],
        borderColor: chartColor('--srb-surface', '#ffffff'),
        borderWidth: 3,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.formattedValue} ${t('times')}`,
          },
        },
      },
    },
  }));

  let domainsConfiguration = $derived.by((): ChartConfiguration<'bar'> => ({
    type: 'bar',
    data: {
      labels: visibleTopDomains.map((item) => item.domain),
      datasets: [{
        label: t('topDomains'),
        data: visibleTopDomains.map((item) => item.count),
        backgroundColor: visibleTopDomains.map((_, index) => [
          chartColor('--srb-primary', '#328f7e'),
          chartColor('--srb-chart-purple', '#898beb'),
          chartColor('--srb-accent', '#9fdd60'),
        ][index % 3]),
        borderRadius: 7,
        borderSkipped: false,
        barThickness: 14,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (context) => `${context.label}: ${context.parsed.x ?? 0} ${t('times')}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: chartColor('--srb-border-light', '#eef0f5') },
        },
        y: {
          grid: { display: false },
          ticks: {
            callback(value) {
              return truncateDomainLabel(this.getLabelForValue(Number(value)));
            },
          },
        },
      },
    },
  }));
</script>

<div class="dash">
  <header class="dash-page-heading">
    <div>
      <h1>{t('dashboardTitle')}</h1>
    </div>
    <div class="range-switch" role="group" aria-label={t('blockTrend')}>
      <button
        type="button"
        aria-pressed={rangeDays === 7}
        class:active={rangeDays === 7}
        onclick={() => rangeDays = 7}
      >{t('last7Days')}</button>
      <button
        type="button"
        aria-pressed={rangeDays === 30}
        class:active={rangeDays === 30}
        onclick={() => rangeDays = 30}
      >{t('last30Days')}</button>
    </div>
  </header>

  <div class="dash-overview-grid">
    <section class="dash-hero" aria-labelledby="total-blocked-title">
      <div class="dash-hero-main">
        <span id="total-blocked-title" class="dash-eyebrow">{t('totalBlocked')}</span>
        <div class="dash-hero-total">
          <strong class="dash-hero-number">{totalBlockCount}</strong>
          <span class="dash-hero-unit">{t('times')}</span>
        </div>
        <div class="dash-hero-watermark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
      </div>
      <div class="dash-hero-metrics">
        <div class="dash-hero-metric">
          <span>{t('today')}</span>
          <strong>{todayBlockCount}<small>{t('times')}</small></strong>
        </div>
        <div class="dash-hero-metric">
          <span>{t('tabRules')}</span>
          <strong>{totalCount}<small>{t('rulesCount')}</small></strong>
        </div>
      </div>
    </section>

    <section class="dash-kpis" aria-label={t('dashboardTitle')}>
      <article class="kpi-card">
        <span class="kpi-label">{t('rangeBlocked')}</span>
        <strong class="kpi-value" data-testid="range-total">
          {summary.total}<small class="kpi-unit">{t('times')}</small>
        </strong>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">{t('dailyAverage')}</span>
        <strong class="kpi-value">
          {summary.average}<small class="kpi-unit">{t('perDayUnit')}</small>
        </strong>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">{t('peakBlocked')}</span>
        <strong class="kpi-value">
          {summary.peakCount}<small class="kpi-unit">{t('times')}</small>
        </strong>
        <span class="kpi-context">
          {summary.peakDate ? dateLabel(summary.peakDate) : t('peakNoDate')}
        </span>
      </article>
    </section>
  </div>

  <div class="detail-grid">
    <section class="dash-card trend-card">
      <div class="dash-card-heading">
        <div>
          <h2>{t('blockTrend')}</h2>
        </div>
        {#if hasTrendData}
          <span class="trend-total">{summary.total} {t('times')}</span>
        {/if}
      </div>
      {#if hasTrendData}
        <div class="chart-frame trend-chart">
          <ChartCanvas
            ariaLabel={t('chartTrendAria', String(rangeDays))}
            configuration={trendConfiguration}
          />
        </div>
      {:else}
        <div class="dash-empty">{t('noData')}</div>
      {/if}
    </section>

    <section class="dash-card breakdown-card">
      <div class="dash-card-heading">
        <div>
          <h2>{t('blockBreakdown')}</h2>
        </div>
      </div>
      {#if hasBreakdownData}
        <div class="chart-frame compact-chart">
          <ChartCanvas
            ariaLabel={t('chartBreakdownAria')}
            configuration={breakdownConfiguration}
          />
        </div>
        <div class="breakdown-list">
          <span><i class="dot teal"></i>{t('adLabel')} <strong>{breakdown.ads}</strong></span>
          <span><i class="dot lime"></i>{t('domainLabel')} <strong>{breakdown.domains}</strong></span>
          <span><i class="dot lavender"></i>{t('otherLabel')} <strong>{breakdown.other}</strong></span>
        </div>
      {:else}
        <div class="dash-empty">{t('noData')}</div>
      {/if}
    </section>

    <section class="dash-card domains-card">
      <div class="dash-card-heading">
        <div>
          <h2>{t('topDomains')}</h2>
        </div>
      </div>
      {#if visibleTopDomains.length === 0}
        <div class="dash-empty">{t('noData')}</div>
      {:else}
        <div class="chart-frame domain-chart">
          <ChartCanvas
            ariaLabel={t('chartDomainsAria')}
            configuration={domainsConfiguration}
          />
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .dash {
    display: flex;
    flex-direction: column;
    gap: var(--srb-space-lg);
  }

  .dash-page-heading,
  .dash-card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--srb-space-lg);
  }

  .dash-page-heading { margin-bottom: var(--srb-space-sm); }
  .dash-page-heading h1 {
    margin: 0;
    color: var(--srb-text-strong);
    font-size: 30px;
    font-weight: var(--srb-weight-heavy);
    letter-spacing: -0.035em;
  }
  .range-switch {
    display: inline-flex;
    gap: 3px;
    padding: 4px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-lg);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .range-switch button {
    min-height: 34px;
    padding: 0 13px;
    border: 0;
    border-radius: var(--srb-radius-md);
    background: transparent;
    color: var(--srb-text-secondary);
    cursor: pointer;
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
    transition: background var(--srb-transition-base), color var(--srb-transition-base);
  }
  .range-switch button:hover { background: var(--srb-control-hover-bg); }
  .range-switch button.active {
    background: var(--srb-primary-action);
    color: var(--srb-on-primary);
  }
  .range-switch button:focus-visible {
    outline: 2px solid var(--srb-primary);
    outline-offset: 2px;
  }

  .dash-overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--srb-space-lg);
  }

  .dash-hero {
    display: grid;
    position: relative;
    isolation: isolate;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-height: 168px;
    padding: 30px 34px;
    overflow: hidden;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-dialog);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .dash-hero::before {
    content: '';
    position: absolute;
    z-index: -1;
    width: 280px;
    height: 280px;
    left: -150px;
    top: -170px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--srb-primary) 12%, transparent);
  }
  .dash-hero-main,
  .dash-hero-metrics {
    position: relative;
    z-index: 1;
  }
  .dash-eyebrow,
  .kpi-label {
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-caps);
    text-transform: uppercase;
  }
  .dash-eyebrow { color: var(--srb-primary); }
  .dash-hero-total {
    display: flex;
    position: relative;
    z-index: 1;
    align-items: baseline;
    gap: var(--srb-space-sm);
    margin-top: 8px;
  }
  .dash-hero-number {
    color: var(--srb-text-strong);
    font-size: 56px;
    font-weight: var(--srb-weight-heavy);
    letter-spacing: -0.055em;
    line-height: 0.95;
  }
  .dash-hero-unit {
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .dash-hero-metrics {
    display: grid;
    grid-template-columns: repeat(2, 132px);
    gap: var(--srb-space-md);
  }
  .dash-hero-metric {
    display: flex;
    min-width: 0;
    padding: 16px 18px;
    border: 1px solid var(--srb-border-light);
    border-radius: var(--srb-radius-lg);
    background: color-mix(in srgb, var(--srb-primary) 5%, var(--srb-bg));
    flex-direction: column;
    gap: 8px;
  }
  .dash-hero-metric > span {
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-semibold);
  }
  .dash-hero-metric strong {
    color: var(--srb-text-strong);
    font-size: 24px;
    line-height: 1;
  }
  .dash-hero-metric small {
    margin-left: 5px;
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-2xs);
    font-weight: var(--srb-weight-semibold);
  }
  .dash-hero-watermark {
    position: absolute;
    z-index: 0;
    width: 112px;
    right: 24px;
    top: 50%;
    color: var(--srb-primary);
    opacity: 0.055;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .dash-hero-watermark svg { display: block; width: 100%; }

  .dash-kpis {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--srb-space-md);
  }
  .kpi-card {
    display: flex;
    min-width: 0;
    padding: var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
    flex-direction: column;
    justify-content: center;
  }
  .kpi-label { color: var(--srb-text-muted); }
  .kpi-value {
    margin: 10px 0 0;
    color: var(--srb-text-strong);
    font-size: 32px;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .kpi-unit {
    margin-left: 6px;
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-semibold);
    letter-spacing: 0;
  }
  .kpi-context {
    margin-top: 8px;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-xs);
  }

  .dash-card {
    padding: var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .dash-card-heading { margin-bottom: var(--srb-space-lg); }
  .dash-card-heading h2 {
    margin: 0;
    color: var(--srb-text-strong);
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
  }
  .trend-total {
    padding: 6px 10px;
    border-radius: var(--srb-radius-full);
    background: var(--srb-accent-light);
    color: var(--srb-primary-hover);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
  }

  .chart-frame { position: relative; width: 100%; }
  .trend-chart { height: 250px; }
  .compact-chart { height: 205px; }
  .domain-chart { height: 205px; }
  .chart-frame :global(canvas) { width: 100% !important; height: 100% !important; }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--srb-space-lg);
  }
  .trend-card { grid-column: 1 / -1; }
  .breakdown-list {
    display: flex;
    justify-content: center;
    gap: var(--srb-space-lg);
    margin-top: var(--srb-space-sm);
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-xs);
  }
  .breakdown-list span {
    display: inline-flex;
    align-items: center;
    gap: var(--srb-space-xs);
  }
  .breakdown-list strong { color: var(--srb-text-strong); }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: 0 0 auto;
  }
  .dot.lavender { background: var(--srb-chart-purple); }
  .dot.teal { background: var(--srb-primary); }
  .dot.lime { background: var(--srb-accent); }

  .dash-empty {
    display: grid;
    min-height: 230px;
    border-radius: var(--srb-radius-lg);
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-sm);
    place-items: center;
  }

  @media (max-width: 700px) {
    .dash-page-heading { align-items: stretch; flex-direction: column; }
    .range-switch { align-self: flex-start; }
    .dash-kpis,
    .detail-grid { grid-template-columns: 1fr; }
    .trend-card { grid-column: auto; }
    .dash-hero {
      grid-template-columns: 1fr;
      min-height: 0;
      padding: var(--srb-space-xl);
      gap: var(--srb-space-xl);
    }
    .dash-hero-number { font-size: 46px; }
    .dash-hero-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dash-hero-watermark { width: 96px; right: 12px; top: 20px; transform: none; }
    .breakdown-list { align-items: flex-start; flex-direction: column; }
  }
</style>
