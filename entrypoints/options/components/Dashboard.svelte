<script lang="ts">
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
    return d.toLocaleDateString('zh-CN', { weekday: 'short' });
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
      <span class="dash-hero-label">累计拦截</span>
      <strong class="dash-hero-number">{totalBlockCount}</strong>
      <span class="dash-hero-sub">
        今日 <strong>{todayBlockCount}</strong> 次
        <span class="dash-hero-divider">·</span>
        规则 <strong>{totalCount}</strong> 条
      </span>
    </div>
  </section>

  <!-- TWO-COLUMN: BREAKDOWN + CHART -->
  <div class="dash-cols">
    <section class="dash-card">
      <div class="dash-card-heading">
        <h2 class="card-title">拦截构成</h2>
        <p class="card-desc">不同类型拦截占比</p>
      </div>
      <div class="breakdown-bar">
        {#if adPct > 0}
          <div class="breakdown-segment ad" style="flex: {adPct}" title="广告 {adPct}%">
            <span class="breakdown-seg-label">广告 {adPct}%</span>
          </div>
        {/if}
        {#if domainPct > 0}
          <div class="breakdown-segment domain" style="flex: {domainPct}" title="域名 {domainPct}%">
            <span class="breakdown-seg-label">域名 {domainPct}%</span>
          </div>
        {/if}
        {#if otherPct > 0}
          <div class="breakdown-segment other" style="flex: {otherPct}" title="其他 {otherPct}%"></div>
        {/if}
      </div>
      <div class="breakdown-legend">
        <span class="legend-item"><span class="legend-dot ad"></span>广告 {adBlockCount} 次</span>
        <span class="legend-item"><span class="legend-dot domain"></span>域名 {domainBlockCount} 次</span>
        <span class="legend-item"><span class="legend-dot other"></span>其他 {Math.max(0, totalBlockCount - adBlockCount - domainBlockCount)} 次</span>
      </div>
    </section>

    <section class="dash-card">
      <div class="dash-card-heading">
        <h2 class="card-title">近 7 天趋势</h2>
        <p class="card-desc">每日拦截次数</p>
      </div>
      <div class="chart">
        {#each weekStats as day}
          <div class="chart-bar-group" title="{day.date}: {day.count} 次">
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
      <h2 class="card-title">被拦截最多的域名</h2>
      <p class="card-desc">按拦截次数排序</p>
    </div>
    {#if topBlockedDomains.length === 0}
      <div class="dash-empty">暂无数据</div>
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
    gap: 16px;
  }

  /* ─── HERO ─── */
  .dash-hero {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 28px 32px;
    border-radius: 18px;
    border: 1px solid #c2ddd1;
    background: linear-gradient(135deg, #f6fcf9 0%, #e6f3ed 100%);
  }
  .dash-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: #0a5532;
    color: #fff;
    flex-shrink: 0;
  }
  .dash-hero-body { display: flex; flex-direction: column; }
  .dash-hero-label {
    color: #64756d;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .dash-hero-number {
    color: #0a5532;
    font-size: 42px;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }
  .dash-hero-sub {
    color: #64756d;
    font-size: 14px;
    margin-top: 4px;
  }
  .dash-hero-sub strong { color: #18211d; }
  .dash-hero-divider {
    margin: 0 8px;
    color: #c2ddd1;
  }

  /* ─── TWO-COLUMN ─── */
  .dash-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .dash-card {
    padding: 20px;
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .dash-card-heading { margin-bottom: 14px; }

  /* ─── BREAKDOWN ─── */
  .breakdown-bar {
    display: flex;
    height: 32px;
    border-radius: 10px;
    overflow: hidden;
    background: #eef2f0;
  }
  .breakdown-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    transition: flex 0.3s;
  }
  .breakdown-segment.ad { background: #c43d3d; }
  .breakdown-segment.domain { background: #0d8f66; }
  .breakdown-segment.other { background: #b7c6be; }
  .breakdown-seg-label {
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 6px;
  }
  .breakdown-legend {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #607169;
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .legend-dot.ad { background: #c43d3d; }
  .legend-dot.domain { background: #0d8f66; }
  .legend-dot.other { background: #b7c6be; }

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
    background: linear-gradient(180deg, #0d8f66, #6ee7b7);
    border-radius: 4px 4px 2px 2px;
    min-height: 3px;
    transition: height 0.3s ease;
  }
  .chart-bar.zero { background: #e2e9e4; }
  .chart-bar-label {
    font-size: 10px;
    color: #9aa8a1;
    margin-top: 6px;
    font-weight: 500;
  }

  /* ─── TOP DOMAINS ─── */
  .dash-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    color: #9aa8a1;
    font-size: 13px;
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
    color: #9aa8a1;
    flex-shrink: 0;
    z-index: 1;
  }
  .dash-domain-bar {
    position: absolute;
    left: 0;
    height: 100%;
    border-radius: 8px;
    background: #eaf7f1;
    z-index: 0;
    transition: width 0.4s ease;
  }
  .dash-domain-name {
    flex: 1;
    font-size: 13px;
    font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
    color: #1d2a24;
    word-break: break-all;
    line-height: 1.4;
    z-index: 1;
  }
  .dash-domain-count {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: #0a5532;
    z-index: 1;
  }

  /* ─── CARD TITLE / DESC ─── */
  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .card-desc {
    margin: 4px 0 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1100px) {
    .dash-cols { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .dash-hero { padding: 20px; gap: 14px; flex-wrap: wrap; }
    .dash-hero-number { font-size: 30px; }
    .breakdown-legend { flex-direction: column; gap: 6px; }
  }
</style>
