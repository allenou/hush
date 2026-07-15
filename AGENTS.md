# Hush — AGENTS.md

## 项目概述

Chrome 浏览器扩展，用于管理搜索结果页面——屏蔽指定域名、标记广告、记录搜索历史。用户可通过悬浮按钮快速屏蔽某个域名或链接，支持 Google / Baidu / Bing / 360搜索 等主流搜索引擎。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | WXT v0.20（Web Extension Toolkit） |
| UI | Svelte 5 |
| 语言 | TypeScript (strict mode, ESNext) |
| 构建 | WXT 内置（基于 Vite） |
| 存储 | chrome.storage.local |
| 清单 | Manifest V3 |

## 目录结构

```
hush/
├── src/                        # 源码目录（WXT srcDir）
│   ├── entrypoints/            # WXT 入口点
│   │   ├── background.ts       # Service Worker — 图标 Badge 更新
│   │   ├── content.ts          # Content Script — 核心屏蔽逻辑 + 教学模式
│   │   ├── options/            # 选项页（Svelte）
│   │   │   ├── App.svelte      #  屏蔽列表管理 + 自定义搜索引擎管理
│   │   │   ├── index.html
│   │   │   └── main.ts
│   │   └── popup/              # 弹窗（Svelte）
│   │       ├── App.svelte      #  启用开关 + 拦截统计 + 教学模式入口
│   │       ├── index.html
│   │       └── main.ts
│   ├── helpers/                # DOM 交互、搜索引擎检测、广告屏蔽等逻辑
│   │   ├── search-engines.ts   # 搜索引擎配置定义与检测
│   │   └── ui.ts               # Content Script 注入 UI
│   ├── utils/                  # 共享工具模块
│   │   ├── domain.ts           # 域名提取工具函数
│   │   └── storage.ts          # chrome.storage 封装（CRUD + 订阅）
│   ├── constants/              # UI 常量与导出
│   └── styles/                 # 共享样式
├── docs/                       # 设计文档与实施计划
├── public/                     # 静态资源
├── tests/                      # Vitest 测试
├── wxt.config.ts               # WXT 构建配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 依赖：wxt, svelte, typescript
```

## 核心架构

### 数据流

```
用户操作 → content.ts (DOM扫描/交互)
                ↓
          storage.ts (chrome.storage.local)
                ↓
          background.ts (Badge更新)
                ↓
          popup/options (UI反映)
```

所有状态存储在 `chrome.storage.local` 的 `blocker` 键下，格式为 `ExtensionStorage`。

### Storage 数据结构 (`src/utils/storage.ts`)

```typescript
interface ExtensionStorage {
  urls: string[];           // 屏蔽的域名列表
  blockedUrls: string[];    // 屏蔽的完整 URL 列表
  blockCount: number;       // 累计拦截次数
  enabled: boolean;         // 插件启用状态
  customEngines: SearchEngineConfig[];  // 用户自定义搜索引擎
  stats: BlockStats[];      // 近30天拦截统计
}
```

### 搜索引擎配置 (`src/helpers/search-engines.ts`)

```typescript
interface SearchEngineConfig {
  name: string;              // 显示名称
  hostname: string;          // 站点 hostname（如 www.google.com）
  containerSelector: string; // 结果容器的 DOM 选择器
  itemSelector: string;      // 单条结果的选择器
  linkSelector: string;      // 结果中链接的选择器（默认 a[href]）
}
```

内置引擎：Google (`#search > .g`)、Baidu (`#content_left > .result`)、Bing (`#b_results > .b_algo`)、DuckDuckGo (`.results > .result`)。

## Content Script 核心逻辑 (`src/entrypoints/content.ts`)

- **定位引擎**：根据当前 URL hostname 匹配内置或自定义引擎
- **DOM 扫描**：使用 `MutationObserver` 监听容器变化，`debounce(300ms)` 后重新扫描
- **处理结果**：对每条未处理的结果注入 ⊕ 按钮（悬浮显示）或"已屏蔽"徽标
- **屏蔽方式**：右键菜单 — 屏蔽此域名 / 屏蔽此链接
- **取消屏蔽**：点击"已屏蔽"徽标，按优先级：仅域名 → 仅链接 → 两者皆有时弹 confirm 选择
- **教学模式**：点击 popup "教我识别" → 遮罩提示用户点击一条结果 → 自动生成选择器路径 → 保存为自定义引擎

## 开发命令

```bash
npm run dev          # 开发模式（热更新）
npm run build        # 构建生产版本
npm run zip          # 打包为 .zip
npm run wxt-prepare  # WXT 类型生成
```

## 约定与规范

- **语言**：代码注释使用中文，变量/函数/文件名使用英文
- **导入**：使用 `type` 关键字导入类型（`import type { ... }`），遵循 `verbatimModuleSyntax`
- **CSS**：组件内使用 `<style>` 标签隔离样式；注入的 DOM 元素使用行内 `cssText` 赋值
- **API 兼容**：使用 `chrome.*` API（非 `browser.*`）
- **代码风格**：无 Prettier/ESLint 配置，遵循项目现有风格（2 空格缩进，Svelte 组件使用单文件 `.svelte`）
- **命名**：注入的 DOM 元素使用 `srb-` 前缀（Hush）
- **通信**：Content Script ↔ Popup 通过 `chrome.runtime.sendMessage` / `onMessage`

## 重要注意事项

- `wxt.config.ts` 中 `host_permissions: ['<all_urls>']` 确保 content script 可在任意页面运行
- `wxt.config.ts` 中 `srcDir: 'src'` 指定 WXT 源码目录；`@/...` alias 指向 `src/`
- Content script 使用 `runAt: 'document_end'` 确保 DOM 就绪后执行
- 存储读写均为异步操作，注意 `await`
- 自定义搜索引擎选择器需要经过验证（至少匹配 2 个元素）
- 内置引擎不可删除，自定义引擎可删除
- 所有 Svelte 5 组件使用 runes 语法（`$state`、`$derived`、`$effect` 等），但当前代码使用传统 Svelte 语法（`let`、`onclick`、`bind:value`）— 保持一致即可

## Git

- 作者：allenou <jskindler@outlook.com>
- 当前分支：dev（主分支为 master）
- ❌ **严禁自动提交/推送代码** — 所有 `git commit`、`git push` 操作必须得到用户明确许可后才能执行
