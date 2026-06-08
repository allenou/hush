# 搜索结果屏蔽增强设计

## 概述

在 WXT 重构后的基础上，对 Search Result Blocker 进行功能增强和体验打磨。核心是让用户能在搜索结果页上**直接标记屏蔽**，并**教扩展识别新搜索引擎**，同时提供已屏蔽内容的可视化反馈和统计。

## 功能清单

| # | 模块 | 内容 |
|---|------|------|
| 1 | Storage 扩展 | 新增 `blockedUrls: string[]`，URL 精确匹配 |
| 2 | Hover 屏蔽按钮 | 每个搜索结果 hover 出 ⊕ 按钮 → 选"屏蔽域名/屏蔽链接" |
| 3 | 已屏蔽徽标 | 已被屏蔽的结果显示"已屏蔽"角标，点击可撤销 |
| 4 | Teaching Mode | 用户在 popup 开启教学模式 → 点击某个搜索结果 → 扩展自动解析 DOM 生成选择器 |
| 5 | Options 改造 | 域名+URL 合并列表展示，可添加/删除，带类型图标区分 |
| 6 | 图标 Badge | 扩展图标上显示总拦截数 |
| 7 | 拦截统计 | Popup 显示今日/本周拦截趋势 |
| 8 | 折叠提示条 | 页面顶部显示"已屏蔽 X 个结果"条 |

## Storage 数据模型

```typescript
interface ExtensionStorage {
  urls: string[];              // 已被屏蔽的域名列表
  blockedUrls: string[];       // 已被屏蔽的精确 URL 列表
  blockCount: number;          // 总拦截次数
  enabled: boolean;            // 全局启用开关
  customEngines: SearchEngineConfig[];  // 用户自学习的搜索引擎
  stats: BlockStats[];         // 拦截统计
}

interface SearchEngineConfig {
  name: string;                // 自定义名称，如"我的搜索"
  hostname: string;            // www.example.com
  containerSelector: string;   // 搜索结果容器选择器
  itemSelector: string;        // 单条结果选择器
  linkSelector: string;        // 链接元素选择器（用于提取 URL）
}

interface BlockStats {
  date: string;                // "2026-06-08"
  count: number;               // 当日拦截数
}
```

默认值：
```typescript
const DEFAULT: ExtensionStorage = {
  urls: [],
  blockedUrls: [],
  blockCount: 0,
  enabled: true,
  customEngines: [],
  stats: [],
};
```

新增 storage 方法：
- `addBlockedUrl(url: string)` — 去重添加
- `removeBlockedUrl(index: number)` — 按索引删除
- `getAllBlocked(): BlockedItem[]` — 返回合并列表（带 `type: 'domain' | 'url'` 标记）
- `addCustomEngine(config)` / `removeCustomEngine(index)`
- `addBlockStat(date: string)` — 当日拦截数 +1
- `getStats(days: number)` — 获取近 N 天统计

## Hover 屏蔽按钮（Content Script）

### 交互流程

每条搜索结果卡片有两种互斥状态：
- **未屏蔽** → 默认显示 ⊕ 按钮（仅 hover 时可见）
- **已屏蔽** → 显示"已屏蔽"徽标，无 ⊕ 按钮

```
页面加载 → 识别搜索引擎 → 获取自定义引擎配置
  ↓
遍历每条搜索结果卡片
  ↓
┌─ 已屏蔽？ ─────────────────────┐
│ 是 → 显示"已屏蔽"徽标          │
│ 否 → 注入 ⊕ 按钮（hover 可见） │
└────────────────────────────────┘
  ↓
用户 hover ⊕ 按钮 → 弹出浮层：
  ┌─────────────────────┐
  │  屏蔽此域名          │
  │  屏蔽此链接          │
  └─────────────────────┘
  ↓
点击任一选项：
  → 写入 chrome.storage
  → ⊕ 按钮切换为"已屏蔽"徽标
  → 页面顶部折叠提示条更新数量
  → 图标 badge 更新
```

### 技术实现

- 每个引擎的配置文件需要增加 `itemSelector`（单条结果选择器）和 `linkSelector`（链接选择器）
- 屏蔽按钮用绝对定位 + z-index，不改变原有布局
- 浮层用原生 DOM 创建，避免 Svelte/框架依赖
- 浮层点击后自动消失（事件冒泡处理）

### 已屏蔽徽标

- 当检测到某个结果已被屏蔽时，不隐藏该结果
- 在卡片右上角（屏蔽按钮位置）显示灰色"已屏蔽"标签
- 鼠标移到标签上显示"点击取消屏蔽"
- 每个徽标在注入时记录匹配类型（domain 匹配 / URL 精确匹配），点击取消时精确移除：
  - 若本条结果是因域名匹配而被屏蔽 → 弹出确认"取消屏蔽此域名？" → 从 `urls` 移除
  - 若本条结果是因 URL 精确匹配而被屏蔽 → 直接从 `blockedUrls` 移除
  - 若两者都匹配 → 弹出选项"取消域名屏蔽 / 取消链接屏蔽"

## Teaching Mode（Content Script + Popup）

### 交互流程

```
用户在非已知搜索引擎页面打开 popup
  ↓
Popup 检测到当前页面不在已知搜索引擎列表
  ↓
显示提示："这个搜索引擎还不认识，教我识别？" → [开始教学]
  ↓
用户点击 [开始教学]
  ↓
Popup 向 content script 发送消息，进入 teaching mode
  ↓
页面出现半透明遮罩，提示"请点击任意一条搜索结果"
  ↓
用户点击一个结果元素
  ↓
Content script:
  1. 获取点击元素的 DOM 路径
  2. 向上遍历找到包含多个相似结构（同级别同类标签）的容器
  3. 生成 `.g`（通过 class 匹配）或 `div[class*="result"]` 等通用选择器
  4. 确定结果容器选择器
  5. 提取链接的 href → 保存搜索引擎配置
  ↓
Popup 显示"已学会！这个网站叫？" → 用户可自定义名称 → 保存
  ↓
立即在当前页生效
```

### 搜索引擎配置升级

预置引擎（Google/Baidu/Bing/DDG）原有的 `{ hostname, selector }`（selector 为 `#search .g`
混合选择器），需要拆分为完整格式：

```typescript
// 新格式
interface SearchEngineConfig {
  name: string;
  hostname: string;
  containerSelector: string;   // 容器元素选择器，如 '#search'
  itemSelector: string;        // 单条结果选择器，如 '.g'
  linkSelector: string;        // 链接元素选择器，用于提取 URL
}

// 预置引擎升级
const BUILT_IN_ENGINES: SearchEngineConfig[] = [
  {
    name: 'Google',
    hostname: 'www.google.com',
    containerSelector: '#search',
    itemSelector: '.g',
    linkSelector: 'a[href]',
  },
  // ...
];
```

Content script 不再用 `querySelectorAll(selector)` 一次拿到所有条目，而是：
1. `querySelector(containerSelector)` 定位容器
2. `container.querySelectorAll(itemSelector)` 拿到所有结果
3. 每条结果中 `result.querySelector(linkSelector)` 提取 URL

### DOM 选择器自动生成策略

用户点击后，算法：
1. 获取点击元素的 tagName + className
2. 向上查找父元素，直到找到包含**3 个以上相同结构子元素**的层级（搜索结果容器）
3. 优先使用 class 选择器，fallback 到 `nth-child` 路径
4. 容错：如果生成的选择器匹配少于 2 个元素，提示用户重试

## Options 页面改造

当前 Options 页面只显示域名列表。改造后布局：

```
屏蔽域名/链接 管理
──────────────────────────────────────
[输入框 + 添加按钮]

列表（域名 + URL 混合，按添加时间倒序）：
  🌐  example.com                    [删除]
  🔗  https://spam.com/page?q=123    [删除]
  🌐  baidu.com                      [删除]

──────────────────────────────────────
自定义搜索引擎
───────────────────────────────
  Google    已预置 [编辑] [删除]
  Baidu     已预置 [编辑] [删除]
  Bing      已预置 [编辑] [删除]
  my-search   (www.mysite.com)       [删除]
  [+ 手动添加]（仅备选，主入口在 popup 的教学模式）
```

## 图标 Badge

在 background.ts 中监听 storage 变化：

```typescript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.blocker) return;
  const count = changes.blocker.newValue?.blockCount ?? 0;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#c00' });
});
```

初始化时也需要读取当前 count 设置 badge。

## 拦截统计

每个拦截操作发生时：
1. `blockCount` +1（总计数）
2. `stats` 数组中当天的记录 +1

Popup 在现有布局下方新增统计区域，读取最近 7 天的 `stats`，用纯 CSS 条形图展示趋势（无图表库依赖）。

```
拦截趋势（近 7 天）
  一  二  三  四  五  六  日
  ██  ████  ██  ██████  ███  ██  █
  2   4    2   6      3    2   1
```

## 折叠提示条

在搜索页面顶部注入一个纯展示提示条：

```
┌────────────────────────────┐
│ 🚫 已屏蔽 5 个低质量结果   │
└────────────────────────────┘
```

- 固定在搜索框下方或结果列表顶部
- 展示当前页面被屏蔽的结果数量（content script 实时统计 badge 数量）
- 纯展示，无操作按钮（取消屏蔽走单个结果 badge 的点击操作）

## 边界情况

- **非搜索引擎页面**：content script 不执行任何操作
- **Teaching Mode 重复学习**：如果已学会的引擎再次教学，更新配置
- **选择器匹配失败**：提示用户重试，最多 3 次后建议手动输入
- **storage 满**：chrome.storage 限制 5MB，统计记录保留最近 30 天
- **多个搜索结果相同 URL**：屏蔽一条，同域名的其他结果做 display
- **搜索结果动态加载**：MutationObserver 对新加载的卡片同样注入按钮
