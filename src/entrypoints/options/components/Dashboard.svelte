<script lang="ts">
  import ChartCanvas from '@/components/ChartCanvas.svelte';
  import { getLocale, t } from '@/utils/locale-store.svelte';
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

  let rangeDays = $state<StatisticsRange>(30);
  let dailySeries = $derived(buildDailySeries(dailyStats, rangeDays, now));
  let summary = $derived(summarizeDailySeries(dailySeries));
  let visibleTopDomains = $derived(topBlockedDomains.slice(0, 10));
  let breakdown = $derived(buildBlockBreakdown(
    totalBlockCount,
    adBlockCount,
    domainBlockCount,
  ));
  let hasTrendData = $derived(summary.total > 0);
  let hasTypedTrendData = $derived(dailySeries.some((item) =>
    (item.adCount ?? 0) > 0
    || (item.targetDomainCount ?? 0) > 0
    || (item.subdomainCount ?? 0) > 0
    || (item.otherCount ?? 0) > 0,
  ));
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

  function formatHeroValue(value: number): string {
    return new Intl.NumberFormat(getLocale() === 'zh_CN' ? 'zh-CN' : 'en-US').format(value);
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
    const primary = chartColor('--srb-primary', '#4f5f9f');
    const fill = chartColor('--srb-chart-teal-soft', 'rgba(79, 95, 159, 0.16)');
    const datasets = hasTypedTrendData ? [
      {
        label: t('adLabel'),
        data: dailySeries.map((item) => item.adCount ?? 0),
        borderColor: primary,
        backgroundColor: primary,
      },
      {
        label: t('targetDomainLabel'),
        data: dailySeries.map((item) => item.targetDomainCount ?? 0),
        borderColor: chartColor('--srb-accent', '#78d5ca'),
        backgroundColor: chartColor('--srb-accent', '#78d5ca'),
      },
      {
        label: t('subdomainTrendLabel'),
        data: dailySeries.map((item) => item.subdomainCount ?? 0),
        borderColor: chartColor('--srb-chart-purple', '#898beb'),
        backgroundColor: chartColor('--srb-chart-purple', '#898beb'),
      },
      {
        label: t('otherLabel'),
        data: dailySeries.map((item) => Math.max(
          0,
          item.count
            - (item.adCount ?? 0)
            - (item.targetDomainCount ?? 0)
            - (item.subdomainCount ?? 0),
        )),
        borderColor: chartColor('--srb-text-muted', '#8b8f9c'),
        backgroundColor: chartColor('--srb-text-muted', '#8b8f9c'),
      },
    ].map((dataset) => ({
      ...dataset,
      borderWidth: 2,
      fill: false,
      pointRadius: rangeDays === 7 ? 3 : 0,
      pointHoverRadius: 5,
      tension: 0.32,
    })) : [{
      label: t('dailyBlocks'),
      data: dailySeries.map((item) => item.count),
      borderColor: primary,
      backgroundColor: fill,
      borderWidth: 2,
      fill: true,
      pointBackgroundColor: primary,
      pointBorderColor: chartColor('--srb-surface', '#ffffff'),
      pointBorderWidth: 2,
      pointRadius: rangeDays === 7 ? 4 : rangeDays === 30 ? 2 : 0,
      pointHoverRadius: 5,
      tension: 0.32,
    }];

    return {
      type: 'line',
      data: {
        labels: dailySeries.map((item) => dateLabel(item.date)),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: hasTypedTrendData,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
          },
          tooltip: {
            callbacks: {
              label: (context) => hasTypedTrendData
                ? `${context.dataset.label}: ${context.parsed.y ?? 0} ${t('times')}`
                : `${context.parsed.y ?? 0} ${t('times')}`,
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
          chartColor('--srb-primary', '#4f5f9f'),
          chartColor('--srb-accent', '#78d5ca'),
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
          chartColor('--srb-primary', '#4f5f9f'),
          chartColor('--srb-chart-purple', '#898beb'),
          chartColor('--srb-accent', '#78d5ca'),
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
  <section class="dash-hero" aria-labelledby="total-blocked-title">
    <div class="dash-hero-main">
      <h1 id="total-blocked-title" class="dash-hero-title">{t('totalBlocked')}</h1>
      <div class="dash-hero-total">
        <strong class="dash-hero-number">{formatHeroValue(totalBlockCount)}</strong>
        <span class="dash-hero-unit">{t('times')}</span>
      </div>
    </div>
    <div class="dash-hero-metrics">
      <div class="dash-hero-metric">
        <span>{t('today')}</span>
        <strong>{formatHeroValue(todayBlockCount)}<small>{t('times')}</small></strong>
      </div>
      <div class="dash-hero-metric">
        <span>{t('tabRules')}</span>
        <strong>{formatHeroValue(totalCount)}<small>{t('rulesCount')}</small></strong>
      </div>
    </div>
  </section>

  <section class="range-section" aria-labelledby="recent-stats-title">
    <div class="range-toolbar">
      <h2 id="recent-stats-title">{t('recentStats')}</h2>
      <div class="range-select-shell">
        <select
          value={rangeDays}
          aria-label={t('statisticsRange')}
          onchange={(event) => rangeDays = Number(event.currentTarget.value) as StatisticsRange}
        >
          <option value={7}>{t('last7Days')}</option>
          <option value={30}>{t('last30Days')}</option>
          <option value={90}>{t('last90Days')}</option>
          <option value={180}>{t('last180Days')}</option>
          <option value={365}>{t('last365Days')}</option>
        </select>
      </div>
    </div>

    <section class="dash-kpis" aria-label={t('recentStats')}>
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
  </section>

  <div class="detail-grid">
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

  .dash-card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--srb-space-lg);
  }

  .range-section {
    display: flex;
    flex-direction: column;
    gap: var(--srb-space-lg);
  }
  .range-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--srb-space-lg);
  }
  .range-toolbar h2 {
    margin: 0;
    color: var(--srb-text-strong);
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
  }
  .range-select-shell {
    position: relative;
    flex: 0 0 auto;
  }
  .range-select-shell::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    right: 14px;
    top: 50%;
    border-right: 1.5px solid var(--srb-text-muted);
    border-bottom: 1.5px solid var(--srb-text-muted);
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }
  .range-select-shell select {
    min-width: 132px;
    min-height: 38px;
    padding: 0 38px 0 14px;
    appearance: none;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-md);
    background: var(--srb-surface);
    color: var(--srb-text-secondary);
    cursor: pointer;
    font: inherit;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
    box-shadow: var(--srb-shadow-xs);
    transition: border-color var(--srb-transition-base), box-shadow var(--srb-transition-base);
  }
  .range-select-shell select:hover {
    border-color: var(--srb-primary);
  }
  .range-select-shell select:focus-visible {
    outline: 2px solid var(--srb-primary);
    outline-offset: 2px;
  }

  .dash-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-height: 168px;
    padding: 30px 36px;
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-dialog);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .dash-hero-main {
    min-width: 0;
  }
  .dash-hero-title,
  .kpi-label {
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-caps);
    text-transform: uppercase;
  }
  .dash-hero-title {
    margin: 0;
    color: var(--srb-text-secondary);
  }
  .dash-hero-total {
    display: flex;
    align-items: baseline;
    gap: var(--srb-space-sm);
    margin-top: 12px;
  }
  .dash-hero-number {
    color: var(--srb-text-strong);
    font-size: clamp(56px, 6vw, 68px);
    font-weight: var(--srb-weight-heavy);
    letter-spacing: -0.06em;
    line-height: 0.9;
  }
  .dash-hero-unit {
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-semibold);
  }
  .dash-hero-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(132px, 1fr));
    min-width: 320px;
  }
  .dash-hero-metric {
    display: flex;
    min-width: 0;
    min-height: 92px;
    padding: 8px 28px;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }
  .dash-hero-metric > span {
    color: var(--srb-text-secondary);
    font-size: var(--srb-font-size-body);
    font-weight: var(--srb-weight-bold);
  }
  .dash-hero-metric strong {
    color: var(--srb-primary-action);
    font-size: 30px;
    line-height: 1;
    letter-spacing: -0.035em;
  }
  .dash-hero-metric small {
    margin-left: 6px;
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-2xs);
    font-weight: var(--srb-weight-semibold);
    letter-spacing: 0;
  }

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
    .range-toolbar { align-items: center; flex-direction: row; gap: var(--srb-space-md); }
    .dash-kpis,
    .detail-grid { grid-template-columns: 1fr; }
    .dash-hero {
      grid-template-columns: 1fr;
      min-height: 0;
      padding: 26px 22px;
      gap: 26px;
    }
    .dash-hero-number { font-size: 52px; }
    .dash-hero-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: 0;
    }
    .dash-hero-metric { min-height: 76px; padding: 0 16px; }
    .dash-hero-metric:first-child { padding-left: 0; }
    .breakdown-list { align-items: flex-start; flex-direction: column; }
  }
</style>
