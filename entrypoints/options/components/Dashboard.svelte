<script lang="ts">
  import { t, getLocale } from '@/utils/locale-store.svelte';

  let {
    totalBlockCount = 0,
    todayBlockCount = 0,
    totalCount = 0,
    adBlockCount = 0,
    domainBlockCount = 0,
    adPct = 0,
    domainPct = 0,
    otherPct = 0,
    weekStats = [] as { date: string; count: number }[],
    maxCount = 1,
    topBlockedDomains = [] as { domain: string; count: number }[],
  } = $props();

  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(getLocale(), { weekday: 'short' });
  }
</script>

<div class="dash">
  <!-- HERO -->
  <section class="dash-hero">
    <div class="dash-hero-icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
    <div class="dash-hero-body">
      <span class="dash-hero-label">{t('totalBlocked')}</span>
      <strong class="dash-hero-number">{totalBlockCount}</strong>
      <span class="dash-hero-sub">
        {t('today')} <strong>{todayBlockCount}</strong> {t('times')}
        <span class="dash-hero-divider">·</span>
        {t('rulesCount')} <strong>{totalCount}</strong>
      </span>
    </div>
  </section>

  <!-- TWO-COLUMN: BREAKDOWN + CHART -->
  <div class="dash-cols">
    <section class="dash-card">
      <div class="dash-card-heading">
        <h2 class="card-title">{t('blockBreakdown')}</h2>
        <p class="card-desc">{t('breakdownDesc')}</p>
      </div>
      <div class="breakdown-bar">
        {#if adPct > 0}
          <div class="breakdown-segment ad" style="flex: {adPct}" title="{t('adLabel')} {adPct}%">
            <span class="breakdown-seg-label">{t('adLabel')} {adPct}%</span>
          </div>
        {/if}
        {#if domainPct > 0}
          <div class="breakdown-segment domain" style="flex: {domainPct}" title="{t('domainLabel')} {domainPct}%">
            <span class="breakdown-seg-label">{t('domainLabel')} {domainPct}%</span>
          </div>
        {/if}
        {#if otherPct > 0}
          <div class="breakdown-segment other" style="flex: {otherPct}" title="{t('otherLabel')} {otherPct}%"></div>
        {/if}
      </div>
      <div class="breakdown-legend">
        <span class="legend-item"><span class="legend-dot ad"></span>{t('adLabel')} {adBlockCount} {t('times')}</span>
        <span class="legend-item"><span class="legend-dot domain"></span>{t('domainLabel')} {domainBlockCount} {t('times')}</span>
        <span class="legend-item"><span class="legend-dot other"></span>{t('otherLabel')} {Math.max(0, totalBlockCount - adBlockCount - domainBlockCount)} {t('times')}</span>
      </div>
    </section>

    <section class="dash-card">
      <div class="dash-card-heading">
        <h2 class="card-title">{t('weeklyTrend')}</h2>
        <p class="card-desc">{t('dailyBlocks')}</p>
      </div>
      <div class="chart">
        {#each weekStats as day}
          <div class="chart-bar-group" title="{day.date}: {day.count} {t('times')}">
            <div class="chart-bar" style="height: {Math.max((day.count / maxCount) * 80, 3)}px;" class:zero={day.count === 0}></div>
            <span class="chart-bar-label">{dayLabel(day.date)}</span>
          </div>
        {/each}
      </div>
    </section>
  </div>

  <!-- TOP DOMAINS -->
  <section class="dash-card">
    <div class="dash-card-heading">
      <h2 class="card-title">{t('topDomains')}</h2>
      <p class="card-desc">{t('topDomainsDesc')}</p>
    </div>
    {#if topBlockedDomains.length === 0}
      <div class="dash-empty">{t('noData')}</div>
    {:else}
      <div class="dash-domain-list">
        {#each topBlockedDomains as item, i}
          <div class="dash-domain-row">
            <span class="dash-domain-rank">{i + 1}</span>
            <div class="dash-domain-bar" style="width: {Math.max((item.count / topBlockedDomains[0].count) * 100, 10)}%"></div>
            <code class="dash-domain-name">{item.domain}</code>
            <span class="dash-domain-count">{item.count}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  /* ─── DASHBOARD ─── */
  .dash {
    display: flex;
    flex-direction: column;
    gap: var(--srb-space-lg);
  }

  /* ─── HERO ─── */
  .dash-hero {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 28px 32px;
    border-radius: var(--srb-radius-dialog);
    border: 1px solid var(--srb-hero-border);
    background: var(--srb-hero-gradient);
  }
  .dash-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--srb-radius-card);
    background: var(--srb-primary);
    color: var(--srb-on-primary);
    flex-shrink: 0;
  }
  .dash-hero-body { display: flex; flex-direction: column; }
  .dash-hero-label {
    color: var(--srb-text-soft);
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-bold);
    letter-spacing: var(--srb-tracking-caps);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .dash-hero-number {
    color: var(--srb-primary);
    font-size: var(--srb-font-size-display);
    font-weight: var(--srb-weight-heavy);
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
  .dash-hero-sub {
    color: var(--srb-text-soft);
    font-size: var(--srb-font-size-body);
    margin-top: 4px;
  }
  .dash-hero-sub strong { color: var(--srb-text); }
  .dash-hero-divider {
    margin: 0 8px;
    color: var(--srb-hero-border);
  }

  /* ─── TWO-COLUMN ─── */
  .dash-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--srb-space-lg);
  }
  .dash-card {
    padding: var(--srb-space-xl);
    border: 1px solid var(--srb-border);
    border-radius: var(--srb-radius-card);
    background: var(--srb-surface);
    box-shadow: var(--srb-shadow-xs);
  }
  .dash-card-heading { margin-bottom: 14px; }

  /* ─── BREAKDOWN ─── */
  .breakdown-bar {
    display: flex;
    height: 32px;
    border-radius: var(--srb-radius-lg);
    overflow: hidden;
    background: var(--srb-breakdown-bg);
  }
  .breakdown-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    transition: flex var(--srb-transition-slow);
  }
  .breakdown-segment.ad { background: var(--srb-danger); }
  .breakdown-segment.domain { background: var(--srb-engine-google); }
  .breakdown-segment.other { background: var(--srb-segment-other); }
  .breakdown-seg-label {
    color: var(--srb-on-primary);
    font-size: var(--srb-font-size-xs);
    font-weight: var(--srb-weight-bold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 6px;
  }
  .breakdown-legend {
    display: flex;
    gap: var(--srb-space-lg);
    margin-top: 12px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--srb-space-xs);
    font-size: var(--srb-font-size-sm);
    color: var(--srb-text-secondary);
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .legend-dot.ad { background: var(--srb-danger); }
  .legend-dot.domain { background: var(--srb-engine-google); }
  .legend-dot.other { background: var(--srb-segment-other); }

  /* ─── CHART ─── */
  .chart {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 96px;
  }
  .chart-bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .chart-bar {
    width: 100%;
    max-width: 40px;
    background: var(--srb-chart-gradient);
    border-radius: 4px 4px 2px 2px;
    min-height: 3px;
    transition: height 0.3s ease;
  }
  .chart-bar.zero { background: var(--srb-border-light); }
  .chart-bar-label {
    font-size: var(--srb-font-size-2xs);
    color: var(--srb-text-muted);
    margin-top: 6px;
    font-weight: 500;
  }

  /* ─── TOP DOMAINS ─── */
  .dash-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    color: var(--srb-text-muted);
    font-size: var(--srb-font-size-sm);
  }
  .dash-domain-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dash-domain-row {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    padding: 6px 0;
  }
  .dash-domain-rank {
    width: 20px;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--srb-text-muted);
    flex-shrink: 0;
    z-index: 1;
  }
  .dash-domain-bar {
    position: absolute;
    left: 0;
    height: 100%;
    border-radius: 8px;
    background: var(--srb-accent-soft);
    z-index: 0;
    transition: width 0.4s ease;
  }
  .dash-domain-name {
    flex: 1;
    font-size: var(--srb-font-size-sm);
    font-family: var(--srb-mono);
    color: var(--srb-text-code);
    word-break: break-all;
    line-height: 1.4;
    z-index: 1;
  }
  .dash-domain-count {
    flex-shrink: 0;
    font-size: var(--srb-font-size-sm);
    font-weight: var(--srb-weight-bold);
    color: var(--srb-primary);
    z-index: 1;
  }

  /* ─── CARD TITLE / DESC ─── */
  .card-title {
    margin: 0;
    font-size: var(--srb-font-size-title);
    font-weight: var(--srb-weight-bold);
    letter-spacing: -0.02em;
    line-height: var(--srb-line-height-tight);
  }
  .card-desc {
    margin: 4px 0 0;
    color: var(--srb-text-subtle);
    font-size: var(--srb-font-size-sm);
    line-height: var(--srb-line-height-body);
  }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1100px) {
    .dash-cols { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .dash-hero { padding: var(--srb-space-xl); gap: var(--srb-space-lg); flex-wrap: wrap; }
    .dash-hero-number { font-size: 30px; }
    .breakdown-legend { flex-direction: column; gap: var(--srb-space-xs); }
  }
</style>
