# Chart.js Statistics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chart.js-powered 7/30-day statistics dashboard and popup mini trend chart using the approved lavender, navy, teal, and lime visual system.

**Architecture:** Keep storage unchanged and add a pure statistics module that converts existing 30-day records into complete local-date series and summaries. Use one shared Svelte canvas lifecycle wrapper around a tree-shaken Chart.js registration module, while Dashboard and Popup own their size-specific chart configurations.

**Tech Stack:** WXT 0.20, Svelte 5, TypeScript strict mode, Chart.js, Vitest, jsdom

**Repository constraint:** Do not run `git commit` or `git push`. The repository `AGENTS.md` overrides the normal frequent-commit workflow. Treat each completed task as an unstaged review checkpoint.

---

## File map

- Create `src/utils/statistics.ts`: local-date series, range summary, and breakdown helpers.
- Create `src/utils/chart.ts`: tree-shaken Chart.js registration and export.
- Create `src/components/ChartCanvas.svelte`: shared Chart.js mount/update/destroy lifecycle.
- Modify `src/entrypoints/options/App.svelte`: retain raw 30-day stats and pass them to Dashboard.
- Modify `src/entrypoints/options/components/Dashboard.svelte`: approved layout, range state, KPI cards, and three charts.
- Modify `src/entrypoints/options/components/AppNav.svelte`: white navigation and approved active-state palette.
- Modify `src/entrypoints/popup/App.svelte`: shared statistics helper and mini line chart.
- Modify `src/styles/theme.css`: approved palette variables and chart colors.
- Modify `public/_locales/zh_CN/messages.json`: new dashboard/chart strings.
- Modify `public/_locales/en/messages.json`: matching English strings.
- Create `tests/statistics.test.ts`: pure behavior tests.
- Create `tests/chart-canvas.test.ts`: lifecycle and accessible canvas tests.
- Modify `tests/dashboard.test.ts`: range switch, empty state, and accessible chart coverage.
- Create `tests/popup.test.ts`: popup chart accessible-name coverage.
- Modify `package.json` and `package-lock.json`: add `chart.js`.
- Modify `.gitignore`: keep visual-companion session files out of source control.

## Task 1: Add Chart.js dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the runtime dependency**

Run:

```bash
npm install chart.js
```

Expected: `chart.js` appears under `dependencies` in `package.json`, and the lockfile records the resolved version.

- [ ] **Step 2: Confirm dependency placement**

Run:

```bash
npm pkg get dependencies.chart.js
```

Expected: a semver string rather than `{}` or `null`.

## Task 2: Build statistics helpers with TDD

**Files:**
- Create: `tests/statistics.test.ts`
- Create: `src/utils/statistics.ts`

- [ ] **Step 1: Write failing series and summary tests**

Create tests covering local dates, zero filling, summaries, and non-negative breakdowns:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildDailySeries,
  buildBlockBreakdown,
  summarizeDailySeries,
} from '@/utils/statistics';

describe('buildDailySeries', () => {
  it('fills missing local dates in a seven-day range', () => {
    const now = new Date(2026, 6, 13, 12);
    const result = buildDailySeries([
      { date: '2026-07-07', count: 2 },
      { date: '2026-07-13', count: 5 },
    ], 7, now);

    expect(result).toEqual([
      { date: '2026-07-07', count: 2 },
      { date: '2026-07-08', count: 0 },
      { date: '2026-07-09', count: 0 },
      { date: '2026-07-10', count: 0 },
      { date: '2026-07-11', count: 0 },
      { date: '2026-07-12', count: 0 },
      { date: '2026-07-13', count: 5 },
    ]);
  });

  it('crosses month boundaries using local calendar dates', () => {
    const result = buildDailySeries([], 3, new Date(2026, 2, 1, 1));
    expect(result.map((item) => item.date)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });
});

describe('summarizeDailySeries', () => {
  it('returns total, one-decimal average, and the first peak date', () => {
    expect(summarizeDailySeries([
      { date: '2026-07-11', count: 2 },
      { date: '2026-07-12', count: 5 },
      { date: '2026-07-13', count: 5 },
    ])).toEqual({ total: 12, average: 4, peakCount: 5, peakDate: '2026-07-12' });
  });

  it('returns a stable zero summary for an empty series', () => {
    expect(summarizeDailySeries([])).toEqual({
      total: 0,
      average: 0,
      peakCount: 0,
      peakDate: null,
    });
  });
});

describe('buildBlockBreakdown', () => {
  it('never returns a negative other count', () => {
    expect(buildBlockBreakdown(3, 4, 2)).toEqual({ ads: 4, domains: 2, other: 0 });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/statistics.test.ts
```

Expected: FAIL because `@/utils/statistics` does not exist.

- [ ] **Step 3: Implement the minimum statistics module**

Create `src/utils/statistics.ts`:

```ts
import type { BlockStats } from '@/utils/storage';

export type StatisticsRange = 7 | 30;

export interface StatisticsSummary {
  total: number;
  average: number;
  peakCount: number;
  peakDate: string | null;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDailySeries(
  raw: BlockStats[],
  days: number,
  now = new Date(),
): BlockStats[] {
  const counts = new Map(raw.map((item) => [item.date, item.count]));
  const result: BlockStats[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = formatLocalDate(date);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

export function summarizeDailySeries(series: BlockStats[]): StatisticsSummary {
  if (series.length === 0) {
    return { total: 0, average: 0, peakCount: 0, peakDate: null };
  }
  const total = series.reduce((sum, item) => sum + item.count, 0);
  const peak = series.reduce((best, item) => item.count > best.count ? item : best, series[0]);
  return {
    total,
    average: Math.round((total / series.length) * 10) / 10,
    peakCount: peak.count,
    peakDate: peak.count > 0 ? peak.date : null,
  };
}

export function buildBlockBreakdown(total: number, ads: number, domains: number) {
  return { ads, domains, other: Math.max(0, total - ads - domains) };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
npm test -- tests/statistics.test.ts
```

Expected: all statistics tests PASS.

## Task 3: Add a shared Chart.js lifecycle component with TDD

**Files:**
- Create: `tests/chart-canvas.test.ts`
- Create: `src/utils/chart.ts`
- Create: `src/components/ChartCanvas.svelte`

- [ ] **Step 1: Write a failing lifecycle test**

The component exposes an injectable factory only for deterministic lifecycle testing:

```ts
import { mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ChartCanvas from '@/components/ChartCanvas.svelte';

describe('ChartCanvas', () => {
  it('creates an accessible chart and destroys it on unmount', async () => {
    const destroy = vi.fn();
    const update = vi.fn();
    const factory = vi.fn(() => ({ destroy, update }));
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(ChartCanvas, {
      target,
      props: {
        ariaLabel: '最近 7 天拦截趋势',
        configuration: { type: 'line', data: { labels: [], datasets: [] } },
        factory,
      },
    });

    expect(target.querySelector('canvas')?.getAttribute('aria-label')).toBe('最近 7 天拦截趋势');
    expect(factory).toHaveBeenCalledOnce();
    await unmount(component);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/chart-canvas.test.ts
```

Expected: FAIL because `ChartCanvas.svelte` does not exist.

- [ ] **Step 3: Register only required Chart.js modules**

Create `src/utils/chart.ts`:

```ts
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

export { Chart };
```

- [ ] **Step 4: Implement the Svelte lifecycle wrapper**

Create `src/components/ChartCanvas.svelte` with a typed factory, guarded creation, reactive updates, and `destroy()` cleanup. The production default calls `new Chart(canvas, configuration)`; test factories only need `update()` and `destroy()`.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChartConfiguration } from 'chart.js';
  import { Chart } from '@/utils/chart';

  type ChartHandle = Pick<Chart, 'destroy' | 'update'> & Partial<Pick<Chart, 'data' | 'options'>>;
  type ChartFactory = (canvas: HTMLCanvasElement, configuration: ChartConfiguration) => ChartHandle;

  let {
    ariaLabel,
    configuration,
    factory = (canvas, config) => new Chart(canvas, config),
  } = $props<{
    ariaLabel: string;
    configuration: ChartConfiguration;
    factory?: ChartFactory;
  }>();

  let canvas: HTMLCanvasElement;
  let chart: ChartHandle | null = null;

  onMount(() => {
    try {
      chart = factory(canvas, configuration);
    } catch {
      chart = null;
    }
    return () => {
      chart?.destroy();
      chart = null;
    };
  });

  $effect(() => {
    const next = configuration;
    if (!chart) return;
    if ('data' in chart) chart.data = next.data;
    if ('options' in chart) chart.options = next.options ?? {};
    chart.update();
  });
</script>

<canvas bind:this={canvas} role="img" aria-label={ariaLabel}></canvas>
```

- [ ] **Step 5: Run the lifecycle test and verify GREEN**

Run:

```bash
npm test -- tests/chart-canvas.test.ts
```

Expected: PASS with one factory call and one destroy call.

## Task 4: Add localized dashboard labels and the approved theme

**Files:**
- Modify: `public/_locales/zh_CN/messages.json`
- Modify: `public/_locales/en/messages.json`
- Modify: `src/styles/theme.css`
- Modify: `src/entrypoints/options/components/AppNav.svelte`

- [ ] **Step 1: Add matching locale keys**

Add the following entries to `public/_locales/zh_CN/messages.json`:

```json
"dashboardTitle": { "message": "概览" },
"dashboardSubtitle": { "message": "了解 SearchKit 最近为你拦截了什么" },
"last7Days": { "message": "最近 7 天" },
"last30Days": { "message": "最近 30 天" },
"rangeBlocked": { "message": "区间拦截" },
"dailyAverage": { "message": "日均拦截" },
"peakBlocked": { "message": "峰值" },
"peakNoDate": { "message": "暂无峰值" },
"blockTrend": { "message": "拦截趋势" },
"blockTrendDesc": { "message": "每日被隐藏的搜索结果" },
"chartTrendAria": { "message": "最近 $1 天拦截趋势图" },
"chartBreakdownAria": { "message": "拦截类型分布图" },
"chartDomainsAria": { "message": "高频拦截域名排行图" },
"popupTrendAria": { "message": "最近 7 天拦截趋势图" }
```

Add the matching entries to `public/_locales/en/messages.json`:

```json
"dashboardTitle": { "message": "Overview" },
"dashboardSubtitle": { "message": "See what SearchKit has blocked recently" },
"last7Days": { "message": "Last 7 days" },
"last30Days": { "message": "Last 30 days" },
"rangeBlocked": { "message": "Range total" },
"dailyAverage": { "message": "Daily average" },
"peakBlocked": { "message": "Peak" },
"peakNoDate": { "message": "No peak yet" },
"blockTrend": { "message": "Block trend" },
"blockTrendDesc": { "message": "Search results hidden each day" },
"chartTrendAria": { "message": "$1-day block trend chart" },
"chartBreakdownAria": { "message": "Block type distribution chart" },
"chartDomainsAria": { "message": "Most blocked domains chart" },
"popupTrendAria": { "message": "7-day block trend chart" }
```

- [ ] **Step 2: Add approved palette variables**

Update existing theme variables rather than hard-coding component colors:

```css
--srb-bg: #eef0f9;
--srb-surface: #ffffff;
--srb-primary: #328f7e;
--srb-primary-hover: #287c6d;
--srb-accent: #9fdd60;
--srb-accent-light: #eff9e5;
--srb-text: #11183f;
--srb-text-strong: #11183f;
--srb-text-secondary: #646981;
--srb-text-subtle: #8f92a5;
--srb-text-muted: #a5a8b8;
--srb-border: #e7e9f1;
--srb-border-light: #eef0f5;
--srb-chart-purple: #898beb;
--srb-chart-coral: #ff8c82;
--srb-chart-teal-soft: rgba(50, 143, 126, 0.18);
```

Preserve danger and success semantics used by injected UI; do not replace warning/error colors with decorative chart colors.

- [ ] **Step 3: Restyle navigation without changing behavior**

Change `AppNav.svelte` to a white surface, navy brand text, muted inactive tabs, pale teal active background, and lime active marker. Keep `TABS`, events, sticky positioning, and localized labels unchanged.

- [ ] **Step 4: Run locale tests**

Run:

```bash
npm test -- tests/locale.test.ts
```

Expected: PASS for both existing languages.

## Task 5: Rebuild Dashboard with test-first range behavior

**Files:**
- Modify: `tests/dashboard.test.ts`
- Modify: `src/entrypoints/options/App.svelte`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`

- [ ] **Step 1: Extend Dashboard tests before production changes**

Retain the user's existing weekday-label regression test. Import `tick` from `svelte`, then add a deterministic date helper and these tests:

```ts
function buildStats(days: number): { date: string; count: number }[] {
  const result = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(2026, 6, 13 - offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    result.push({ date: `${year}-${month}-${day}`, count: 1 });
  }
  return result;
}

it('defaults to seven days and switches to thirty days', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  component = mount(Dashboard, {
    target,
    props: {
      dailyStats: buildStats(30),
      now: new Date(2026, 6, 13, 12),
    },
  });

  const buttons = Array.from(target.querySelectorAll<HTMLButtonElement>('.range-button'));
  const seven = buttons.find((button) => button.textContent?.includes('7'));
  const thirty = buttons.find((button) => button.textContent?.includes('30'));
  expect(seven).toBeDefined();
  expect(thirty).toBeDefined();
  expect(seven?.getAttribute('aria-pressed')).toBe('true');
  expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('7');

  thirty?.click();
  await tick();

  expect(thirty?.getAttribute('aria-pressed')).toBe('true');
  expect(target.querySelector('[data-testid="range-total"]')?.textContent).toContain('30');
});

it('renders accessible canvases when chart data exists', () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  component = mount(Dashboard, {
    target,
    props: {
      dailyStats: buildStats(7),
      now: new Date(2026, 6, 13, 12),
      topBlockedDomains: [{ domain: 'example.com', count: 3 }],
    },
  });

  const labels = Array.from(target.querySelectorAll('canvas')).map((canvas) => canvas.getAttribute('aria-label'));
  expect(labels).toHaveLength(3);
  expect(labels.every(Boolean)).toBe(true);
});

it('shows the existing empty state instead of an empty domain chart', () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  component = mount(Dashboard, { target, props: { topBlockedDomains: [] } });
  expect(target.querySelector('.dash-empty')?.textContent?.trim()).not.toBe('');
  expect(target.querySelectorAll('canvas')).toHaveLength(2);
});
```

Update the existing weekday regression coverage to pass `dailyStats` and `now` instead of the removed `weekStats`/`maxCount` props. Date labels are generated inside the Chart.js configuration only; do not render a second `.chart-date-label` fallback beside the canvas.

- [ ] **Step 2: Run Dashboard tests and verify RED**

Run:

```bash
npm test -- tests/dashboard.test.ts
```

Expected: FAIL because the range selector and Chart.js canvases do not exist.

- [ ] **Step 3: Pass raw stats from App to Dashboard**

In `options/App.svelte`:

- Rename `weekStats` state to `dailyStats` and assign `storage.stats ?? []` directly.
- Remove `buildWeekStats`, `maxCount`, `adPct`, `domainPct`, and `otherPct` from App.
- Pass `dailyStats`, total counts, and `topBlockedDomains` to Dashboard.

This keeps all range derivation inside the dashboard boundary.

- [ ] **Step 4: Implement Dashboard state and configurations**

In `Dashboard.svelte`:

- Keep the current `formatDate()` fix from the user's worktree.
- Add `rangeDays = $state<StatisticsRange>(7)`.
- Derive `rangeSeries`, `summary`, and `breakdown` from `statistics.ts`.
- Create line, doughnut, and horizontal bar `ChartConfiguration` objects using localized labels and CSS-variable colors read with `getComputedStyle(document.documentElement)` after mount, with safe literal fallbacks.
- Render localized dates through the Chart.js x-axis only, with no additional first/last date DOM below the canvas.
- Render ordinary DOM text for KPI values, breakdown counts, and domain counts.
- Only render the domain ChartCanvas when `topBlockedDomains.length > 0`; otherwise render `.dash-empty`.
- Use `aria-pressed` on the 7/30-day segmented buttons.

- [ ] **Step 5: Implement the approved responsive layout**

Use the confirmed structure:

```text
page heading + range selector
hero total trend
KPI cards (3 columns)
range trend
doughnut | domain bar
```

Apply white cards, navy text, teal charts, lime KPI emphasis, lavender page background, fine borders, and low-intensity shadows through theme variables. Keep the hero total and range trend cards on standalone rows at non-mobile widths; keep the KPI cards in three columns and the doughnut/domain cards in two columns. Collapse the KPI and detail grids to one column below 700px.

- [ ] **Step 6: Run Dashboard tests and verify GREEN**

Run:

```bash
npm test -- tests/dashboard.test.ts
```

Expected: all Dashboard tests PASS, including the pre-existing weekday label test.

## Task 6: Replace the popup CSS bars with a Chart.js mini trend

**Files:**
- Create: `tests/popup.test.ts`
- Modify: `src/entrypoints/popup/App.svelte`

- [ ] **Step 1: Write a failing popup chart test**

Create `tests/popup.test.ts`:

```ts
import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import Popup from '@/entrypoints/popup/App.svelte';

describe('Popup statistics', () => {
  let component: ReturnType<typeof mount> | undefined;

  afterEach(async () => {
    if (component) await unmount(component);
    component = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders totals as text and the weekly trend as an accessible canvas', async () => {
    const today = new Date();
    const key = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    await fakeBrowser.storage.local.set({
      blocker: {
        blockCount: 12,
        enabled: true,
        stats: [{ date: key, count: 3 }],
      },
    });
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([]);
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(Popup, { target });
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();

    expect(target.querySelector('.stats-grid')?.textContent).toContain('12');
    expect(target.querySelector('.stats-grid')?.textContent).toContain('3');
    expect(target.querySelector('canvas[role="img"]')?.getAttribute('aria-label')).not.toBe('');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/popup.test.ts
```

Expected: FAIL because the popup still renders `.bar-wrapper` elements.

- [ ] **Step 3: Implement the popup mini chart**

In `popup/App.svelte`:

- Replace local `buildWeekStats` with `buildDailySeries(storage.stats ?? [], 7)`.
- Remove `maxCount` and the CSS bar loop.
- Import and render `ChartCanvas` with a fixed-height line configuration.
- Disable legend and axes labels, keep a compact tooltip, and use teal fill with a lime active point.
- Preserve enabled toggle, current-site status, settings action, storage subscription, and the user's current locale behavior.
- Restyle the popup with the approved white/lavender/navy/teal/lime palette.

- [ ] **Step 4: Run the popup test and verify GREEN**

Run:

```bash
npm test -- tests/popup.test.ts
```

Expected: PASS with the accessible canvas and unchanged totals.

## Task 7: Full verification and visual QA

**Files:**
- Verify all modified files

- [ ] **Step 0: Ignore visual-companion session output**

Add this line to `.gitignore` if it is not already present:

```gitignore
.superpowers/
```

Expected: browser mockups remain locally available but no longer appear in `git status`.

- [ ] **Step 1: Run focused tests together**

Run:

```bash
npm test -- tests/statistics.test.ts tests/chart-canvas.test.ts tests/dashboard.test.ts tests/popup.test.ts
```

Expected: all focused tests PASS without warnings or unhandled errors.

- [ ] **Step 2: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all repository tests PASS.

- [ ] **Step 3: Build the extension**

Run:

```bash
npm run build
```

Expected: WXT production build succeeds with no TypeScript or Svelte errors.

- [ ] **Step 4: Inspect bundle output**

Run:

```bash
du -sh .output/chrome-mv3
```

Record the built extension size and verify Chart.js did not introduce an unexpectedly large full-auto bundle.

- [ ] **Step 5: Browser QA**

Run the extension development build, then verify in the browser:

- Options dashboard loads with the approved palette.
- Header is white, not black or full-width dark green.
- 7/30-day control updates trend and KPI values.
- Empty and populated domain states render correctly.
- Charts update after storage changes without duplicate-canvas errors.
- English and Chinese labels update after language changes.
- Dashboard remains readable at wide, tablet, and narrow widths.
- Popup remains within its configured width and its chart height does not jump.
- Browser console contains no Chart.js lifecycle errors.

- [ ] **Step 6: Review the final diff without committing**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended product, test, package, spec, and plan files are changed. Do not commit or push.
