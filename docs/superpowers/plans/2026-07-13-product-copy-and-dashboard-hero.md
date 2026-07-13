# Product Copy and Dashboard Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简整个产品中界面已经直接表达的描述文字，移除概览统计卡彩色顶部边框，并将累计拦截重设计为白底数据中枢卡片。

**Architecture:** 数据流、统计派生和 Chart.js 配置保持不变。改动集中在 Svelte 可见文案与 Dashboard 结构/CSS，中英文语言包同步删除失效键；源码级测试锁定文案边界和视觉规则，组件测试锁定累计、今日、规则及统计单位的可见结构。

**Tech Stack:** Svelte 5、TypeScript、Vitest、WXT、CSS Grid、Chrome i18n messages

---

### Task 1: 锁定产品文案精简边界

**Files:**
- Create: `tests/product-copy.test.ts`
- Modify: `public/_locales/zh_CN/messages.json`
- Modify: `public/_locales/en/messages.json`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`
- Modify: `src/entrypoints/options/components/RulesTab.svelte`
- Modify: `src/entrypoints/options/components/SearchHistoryTab.svelte`
- Modify: `src/entrypoints/options/components/SettingsTab.svelte`
- Modify: `src/entrypoints/options/components/AddRuleDialog.svelte`

- [ ] **Step 1: 写入失败的产品文案测试**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const removedKeys = [
  'dashboardSubtitle',
  'blockTrendDesc',
  'breakdownDesc',
  'topDomainsDesc',
  'rulesDesc',
  'searchHistoryDesc',
  'matchingDesc',
  'searchRecordDesc',
  'languageDesc',
  'addRuleDesc',
];

const keptKeys = [
  'noRulesYetDesc', 'noMatchDesc', 'noHistoryDesc',
  'adBlockDesc', 'subdomainDesc', 'recordSearchDesc',
  'backupDesc', 'backupImportConfirm', 'hintDomainUrl',
  'errorDuplicateUrl', 'errorDuplicateDomain', 'errorInvalidInput',
  'chartTrendAria', 'openSettings',
];

function collectSourcePaths(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return collectSourcePaths(path);
    return /\.(svelte|ts)$/.test(name) ? [path] : [];
  });
}

const sourcePaths = collectSourcePaths(resolve(process.cwd(), 'src'));

describe('product copy', () => {
  it('removes copy already expressed by the interface', () => {
    const sources = sourcePaths
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    for (const key of removedKeys) {
      expect(sources).not.toMatch(new RegExp(`t\\(['\"]${key}['\"]`));
    }
    for (const key of keptKeys) {
      expect(sources).toMatch(new RegExp(`t\\(['\"]${key}['\"]`));
    }
  });

  it.each(['zh_CN', 'en'])('removes unused %s locale keys', (locale) => {
    const messages = JSON.parse(readFileSync(
      resolve(process.cwd(), `public/_locales/${locale}/messages.json`),
      'utf8',
    )) as Record<string, { message: string }>;

    for (const key of removedKeys) {
      expect(messages).not.toHaveProperty(key);
    }
    for (const key of keptKeys) {
      expect(messages).toHaveProperty(key);
    }
    expect(messages).toHaveProperty('perDayUnit');
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/product-copy.test.ts`

Expected: FAIL，因为组件仍引用这些描述键，且中英文语言包仍包含这些键并缺少 `perDayUnit`。

- [ ] **Step 3: 删除重复说明但保留必要指引**

从组件中删除：

```svelte
<!-- Dashboard -->
<p>{t('dashboardSubtitle')}</p>
<p>{t('blockTrendDesc')}</p>
<p>{t('breakdownDesc')}</p>
<p>{t('topDomainsDesc')}</p>

<!-- RulesTab -->
<p class="card-desc">{t('rulesDesc')}</p>

<!-- SearchHistoryTab -->
<p class="card-desc">{t('searchHistoryDesc')}</p>

<!-- SettingsTab -->
<p class="card-desc">{t('matchingDesc')}</p>
<p class="card-desc">{t('searchRecordDesc')}</p>
<p class="card-desc">{t('languageDesc')}</p>

<!-- AddRuleDialog -->
<p class="card-desc">{t('addRuleDesc')}</p>
```

保留 `noRulesYetDesc`、`noMatchDesc`、`noHistoryDesc`、`adBlockDesc`、`subdomainDesc`、`recordSearchDesc`、`backupDesc`、`hintDomainUrl`、错误与无障碍文本。删除组件中不再使用的 `.card-desc` 或标题段落样式；`SettingsTab.svelte` 的 `.card-desc` 仍供备份说明使用。

- [ ] **Step 4: 同步中英文语言包**

删除 `removedKeys` 中的中英文键，并新增：

```json
// zh_CN
"perDayUnit": { "message": "次/日" }

// en
"perDayUnit": { "message": "per day" }
```

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: `npm test -- tests/product-copy.test.ts`

Expected: 3 tests PASS。

### Task 2: 重设计累计拦截并精简统计卡

**Files:**
- Modify: `tests/dashboard.test.ts`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`

- [ ] **Step 1: 添加失败的 Dashboard 结构测试**

在 `tests/dashboard.test.ts` 添加：

```typescript
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
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/dashboard.test.ts`

Expected: FAIL，因为累计卡尚无 `.dash-hero-total`、`.dash-hero-metric` 和 `.kpi-unit` 结构，且卡片标题仍有说明段落。

- [ ] **Step 3: 实现累计拦截数据中枢结构**

将 `.dash-hero` 内容改为：

```svelte
<div class="dash-hero-main">
  <span id="total-blocked-title" class="dash-eyebrow">{t('totalBlocked')}</span>
  <div class="dash-hero-total">
    <strong class="dash-hero-number">{totalBlockCount}</strong>
    <span class="dash-hero-unit">{t('times')}</span>
  </div>
  <div class="dash-hero-watermark" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
```

- [ ] **Step 4: 精简三张统计卡**

移除 `lime`、`teal`、`lavender` 类和重复 `.kpi-meta` 文案，使用数字内联单位：

```svelte
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
  <span class="kpi-context">{summary.peakDate ? dateLabel(summary.peakDate) : t('peakNoDate')}</span>
</article>
```

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: `npm test -- tests/dashboard.test.ts`

Expected: Dashboard tests PASS。

### Task 3: 实现累计卡视觉并移除统计卡彩色顶边

**Files:**
- Modify: `tests/dashboard-layout.test.ts`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`

- [ ] **Step 1: 添加失败的视觉规则断言**

在 `tests/dashboard-layout.test.ts` 添加：

```typescript
it('uses neutral statistic cards and a white total-blocked data hub', () => {
  expect(desktopStyles).not.toMatch(/\.kpi-card\.(lime|teal|lavender)/);
  expect(desktopStyles).not.toMatch(/\.kpi-card[^}]*border-top:/s);
  expect(desktopStyles).toMatch(
    /\.dash-hero\s*\{[^}]*background:\s*var\(--srb-surface\);/s,
  );
  expect(desktopStyles).toMatch(/\.dash-hero-metrics\s*\{/);
  expect(desktopStyles).toMatch(/\.dash-hero-watermark\s*\{/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: FAIL，因为统计卡仍有三个彩色顶部边框类，累计卡仍使用深色实底且没有新结构样式。

- [ ] **Step 3: 实现白底数据中枢样式**

基础规则：

```css
.dash-hero {
  display: grid;
  position: relative;
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
  width: 280px;
  height: 280px;
  left: -150px;
  top: -170px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--srb-primary) 12%, transparent);
}
.dash-hero-main,
.dash-hero-metrics { position: relative; z-index: 1; }
.dash-hero-total { display: flex; align-items: baseline; gap: 8px; }
.dash-hero-number { color: var(--srb-text-strong); font-size: 56px; }
.dash-hero-unit { color: var(--srb-text-muted); font-weight: var(--srb-weight-semibold); }
.dash-hero-metrics { display: grid; grid-template-columns: repeat(2, 132px); gap: var(--srb-space-md); }
.dash-hero-metric { padding: 16px 18px; border-radius: var(--srb-radius-lg); background: var(--srb-bg); }
.dash-hero-watermark { position: absolute; right: 24px; width: 112px; color: var(--srb-primary); opacity: 0.055; }
```

移动端在 `700px` 下将 `.dash-hero` 改为单列、`.dash-hero-metrics` 改为两等分列，并隐藏或缩小水印，避免遮挡。

- [ ] **Step 4: 实现中性统计卡样式**

删除：

```css
.kpi-card.lime { border-top: 4px solid var(--srb-accent); }
.kpi-card.teal { border-top: 4px solid var(--srb-primary); }
.kpi-card.lavender { border-top: 4px solid var(--srb-chart-purple); }
```

新增：

```css
.kpi-unit { margin-left: 6px; color: var(--srb-text-muted); font-size: var(--srb-font-size-xs); }
.kpi-context { color: var(--srb-text-subtle); font-size: var(--srb-font-size-xs); }
```

- [ ] **Step 5: 运行布局测试并确认 GREEN**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: layout tests PASS。

### Task 4: 回归与渲染验证

**Files:**
- Verify: `src/entrypoints/options/components/Dashboard.svelte`
- Verify: `src/entrypoints/options/components/RulesTab.svelte`
- Verify: `src/entrypoints/options/components/SearchHistoryTab.svelte`
- Verify: `src/entrypoints/options/components/SettingsTab.svelte`
- Verify: `src/entrypoints/options/components/AddRuleDialog.svelte`
- Verify: `public/_locales/zh_CN/messages.json`
- Verify: `public/_locales/en/messages.json`

- [ ] **Step 1: 运行相关测试**

Run: `npm test -- tests/dashboard.test.ts tests/dashboard-layout.test.ts tests/product-copy.test.ts`

Expected: all related tests PASS。

- [ ] **Step 2: 运行完整测试套件**

Run: `npm test`

Expected: all test files and tests PASS。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: WXT build succeeds without TypeScript or Svelte errors。

- [ ] **Step 4: 检查差异质量**

Run: `git diff --check`

Expected: no output and exit code 0。

- [ ] **Step 5: 浏览器检查**

检查概览桌面/700px 以下布局、累计卡层级、统计卡无彩色顶边、中文与英文文案缺失是否造成空白；检查规则、搜索记录、设置和新增规则弹窗的标题间距；检查控制台无相关错误。若应用内浏览器继续因安全策略阻止本地 URL，记录限制且不绕过策略。

> 根据项目 `AGENTS.md`，本计划不包含 `git commit` 或 `git push`，除非用户另行明确授权。
