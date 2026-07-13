# Dashboard Duplicate Labels and Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除趋势横坐标和构成图例的重复展示，并将整个产品的缺省区域统一为透明背景。

**Architecture:** 保留 Chart.js 趋势横坐标作为唯一日期来源；构成图关闭 Chart.js 图例，保留带数量的普通 DOM 图例。缺省面板继续保留虚线边框、间距和指引，只删除 Dashboard、规则页和搜索记录页的灰色或半透明背景声明。

**Tech Stack:** Svelte 5、TypeScript、Chart.js、Vitest、CSS

---

### Task 1: 移除重复日期和重复图例

**Files:**
- Modify: `tests/dashboard.test.ts`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`

- [ ] **Step 1: 写入失败的重复展示测试**

将原 `.chart-date-label` 本地化测试替换为：

```typescript
it('uses the chart x-axis as the only visible date-label source', () => {
  const target = render();

  expect(target.querySelector('.chart-date-axis')).toBeNull();
  expect(target.querySelectorAll('.chart-date-label')).toHaveLength(0);
});
```

新增源码配置测试：

```typescript
it('uses one DOM legend for the block breakdown', () => {
  const breakdownConfigSource = dashboardSource.slice(
    dashboardSource.indexOf('let breakdownConfiguration'),
    dashboardSource.indexOf('let domainsConfiguration'),
  );

  expect(breakdownConfigSource).toMatch(/legend:\s*\{\s*display:\s*false\s*\}/s);
  expect((dashboardSource.match(/class="breakdown-list"/g) ?? [])).toHaveLength(1);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/dashboard.test.ts tests/dashboard-layout.test.ts`

Expected: FAIL，因为趋势卡仍输出 `.chart-date-axis`，构成图仍启用 Chart.js 底部图例。

- [ ] **Step 3: 删除额外日期 DOM 与样式**

从 `Dashboard.svelte` 删除：

```svelte
<div class="chart-date-axis" aria-hidden="true">
  <span class="chart-date-label">...</span>
  <span class="chart-date-label">...</span>
</div>
```

以及 `.chart-date-axis` CSS。Chart.js 的 `labels` 和 `x.ticks` 保持不变。

- [ ] **Step 4: 关闭构成图 Chart.js 图例**

将 `breakdownConfiguration.options.plugins.legend` 改为：

```typescript
legend: { display: false },
```

保留 `.breakdown-list`，因为它展示广告、域名、其他的实际数量。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: `npm test -- tests/dashboard.test.ts tests/dashboard-layout.test.ts`

Expected: all Dashboard tests PASS。

### Task 2: 统一缺省状态为透明背景

**Files:**
- Modify: `tests/dashboard-layout.test.ts`
- Modify: `src/entrypoints/options/components/Dashboard.svelte`
- Modify: `src/entrypoints/options/components/RulesTab.svelte`
- Modify: `src/entrypoints/options/components/SearchHistoryTab.svelte`

- [ ] **Step 1: 添加失败的缺省背景测试**

在 `tests/dashboard-layout.test.ts` 读取三个组件源码并新增：

```typescript
it('keeps all empty states on transparent backgrounds', () => {
  expect(dashboardSource).not.toContain('background: var(--srb-empty-bg);');
  expect(dashboardSource).not.toMatch(/\.chart-empty-overlay\s*\{[^}]*background:/s);
  expect(rulesSource).not.toContain('background: var(--srb-empty-bg);');
  expect(searchHistorySource).not.toContain('background: var(--srb-empty-bg);');
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: FAIL，因为四处缺省样式仍声明灰色或半透明背景。

- [ ] **Step 3: 删除缺省背景声明**

删除以下声明，不改变虚线边框、圆角、间距、图标和文案：

```css
/* Dashboard .chart-empty-overlay */
background: color-mix(in srgb, var(--srb-surface) 88%, transparent);

/* Dashboard .dash-empty、RulesTab .empty、SearchHistoryTab .empty */
background: var(--srb-empty-bg);
```

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: layout tests PASS。

### Task 3: 完整验证

**Files:**
- Verify: `src/entrypoints/options/components/Dashboard.svelte`
- Verify: `src/entrypoints/options/components/RulesTab.svelte`
- Verify: `src/entrypoints/options/components/SearchHistoryTab.svelte`

- [ ] **Step 1: 运行完整测试**

Run: `npm test`

Expected: all tests PASS。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: WXT build succeeds。

- [ ] **Step 3: 检查差异**

Run: `git diff --check`

Expected: no output and exit code 0。

- [ ] **Step 4: 浏览器验证**

检查趋势图仅有一组横坐标、构成图仅有一组图例、四类缺省状态无灰色背景。若应用内浏览器继续阻止本地地址，记录限制且不绕过策略。

> 根据项目 `AGENTS.md`，本计划不包含 `git commit` 或 `git push`。
