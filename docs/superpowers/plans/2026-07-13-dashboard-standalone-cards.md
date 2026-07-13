# Dashboard Standalone Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让概览页的“累计拦截”和“拦截趋势”卡片在所有非移动布局中分别独占一整行。

**Architecture:** 保持现有 Svelte DOM、统计派生和 Chart.js 配置不变，仅调整 `Dashboard.svelte` 的 CSS Grid 列定义与跨列规则。使用一个源码级布局回归测试锁定桌面网格规则，再通过构建和浏览器桌面/窄屏检查验证实际渲染。

**Tech Stack:** Svelte 5、TypeScript、Vitest、WXT、CSS Grid

---

### Task 1: 锁定独占行布局规则

**Files:**
- Create: `tests/dashboard-layout.test.ts`
- Test: `tests/dashboard-layout.test.ts`

- [ ] **Step 1: 写入失败的布局回归测试**

```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/entrypoints/options/components/Dashboard.svelte'),
  'utf8',
);
const desktopStyles = dashboardSource.slice(
  dashboardSource.indexOf('<style>'),
  dashboardSource.indexOf('@media'),
);
const mobileStyles = dashboardSource.slice(
  dashboardSource.indexOf('@media (max-width: 700px)'),
);

describe('Dashboard layout', () => {
  it('keeps the total-blocked and trend cards on standalone rows', () => {
    expect(desktopStyles).toMatch(
      /\.dash-overview-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(desktopStyles).toMatch(
      /\.detail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(desktopStyles).toMatch(
      /\.trend-card\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
    );
    expect(desktopStyles).toMatch(
      /\.dash-kpis\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
    );
    expect(mobileStyles).toMatch(
      /\.dash-kpis,\s*\.detail-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认先失败**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: FAIL，因为桌面端 `.dash-overview-grid` 仍为双列、`.detail-grid` 仍为三列，且跨列规则只存在于媒体查询中；KPI 三列与移动端单列断言用于防止后续响应式回退。

### Task 2: 调整概览页桌面网格

**Files:**
- Modify: `src/entrypoints/options/components/Dashboard.svelte:402-406`
- Modify: `src/entrypoints/options/components/Dashboard.svelte:557-624`
- Test: `tests/dashboard-layout.test.ts`

- [ ] **Step 1: 将累计拦截区域改为单列**

```css
.dash-overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--srb-space-lg);
}
```

- [ ] **Step 2: 将详情区改为双列，并让趋势卡跨满两列**

```css
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--srb-space-lg);
}
.trend-card { grid-column: 1 / -1; }
```

- [ ] **Step 3: 删除 1100px 媒体查询中的重复桌面规则**

保留媒体查询结构，但移除已经成为基础规则的 `.dash-overview-grid`、`.detail-grid` 和 `.trend-card` 声明。700px 媒体查询继续将指标卡与详情区改为单列，并将 `.trend-card` 恢复为自动列位置。

- [ ] **Step 4: 运行布局测试**

Run: `npm test -- tests/dashboard-layout.test.ts`

Expected: PASS。

### Task 3: 回归与渲染验证

**Files:**
- Verify: `src/entrypoints/options/components/Dashboard.svelte`
- Verify: `tests/dashboard.test.ts`

- [ ] **Step 1: 运行 Dashboard 测试**

Run: `npm test -- tests/dashboard.test.ts tests/dashboard-layout.test.ts`

Expected: PASS，趋势切换、Canvas 可访问名称、空状态和布局规则均保持正确。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: WXT 构建成功，无 TypeScript 或 Svelte 编译错误。

- [ ] **Step 3: 浏览器检查桌面与窄屏**

桌面宽度确认累计拦截独占第一行、三张指标卡位于下一行、拦截趋势独占一行、类型分布与高频域名并排。窄屏确认所有卡片单列且无裁切、重叠或水平滚动。

> 根据项目 `AGENTS.md`，本计划不包含 `git commit` 或 `git push`，除非用户另行明确授权。
