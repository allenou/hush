# WXT 重构设计文档

## 概述

将 Search Result Blocker Chrome 扩展从原生 JS + HTML 迁移到 **WXT + TypeScript + Svelte** 技术栈，保持原有功能不变的同时修复已知代码质量问题。

## 重构范围

### 保持不变
- 右键菜单标记域名 → chrome.storage → 搜索结果页隐藏匹配域名的核心链路
- storage 数据结构 `{ urls: string[] }`
- assets 目录下的图标等静态资源

### 重构内容
- 全部 JS → TypeScript
- 项目结构 → WXT entrypoints 约定
- 纯手工 DOM → Svelte 组件（popup / options 页面）
- 无构建 → Vite（通过 WXT）

### 修复的已知问题
1. `getDomain()` 函数重复定义 → 抽取为共享模块
2. 简陋的域名正则 → `new URL()` 标准解析
3. `content.js` 形同虚设（仅 `console.log("fuck")`）→ 实现实际屏蔽逻辑
4. 每个 tab 更新都注入脚本 → 仅搜索引擎页面才注入
5. 选择器仅支持 Google → 可配置多搜索引擎
6. Popup 拦截计数写死 → 绑定真实 storage 数据
7. Checkbox 缺 id/不工作 → 用 Svelte 实现
8. 无错误处理 → 添加 try/catch + 兜底
9. Callback/Promise 混用 → 统一 async/await

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | WXT |
| 语言 | TypeScript |
| UI | Svelte |
| 构建 | Vite（WXT 封装） |
| 存储 | chrome.storage（WXT 类型封装） |

## 项目结构

```
search-result-blocker/
├── entrypoints/
│   ├── background.ts              # Service Worker
│   ├── content.ts                 # 搜索结果页屏蔽脚本
│   ├── popup.html                 # Popup HTML 外壳
│   │   └── App.svelte             # Popup 组件（含 mount 逻辑）
│   ├── options.html               # Options HTML 外壳
│   └── options/
│       └── App.svelte             # 设置页组件（含 mount 逻辑）
├── utils/
│   ├── domain.ts                  # 域名提取 & 校验
│   ├── search-engines.ts          # 搜索引擎选择器配置
│   └── storage.ts                 # chrome.storage 类型封装
├── assets/                        # 静态资源
├── public/
│   └── icons/                     # WXT 期望的图标路径
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── .gitignore
```

## 模块设计

### `utils/domain.ts`
- `extractDomain(url: string): string | null` — 用 `new URL()` 解析域名，支持各种 URL 格式
- 导出唯一域名提取函数，消除重复代码

### `utils/search-engines.ts`
- 导出搜索引擎配置数组 `{ hostname, selector }`
- 支持 Google / Baidu / Bing 三种引擎
- 导出 `isSearchEngine(url: string) => SearchEngine | null` 检测函数

### `utils/storage.ts`
```typescript
interface BlockedDomains { urls: string[] }
```
- 类型安全的 get / add / remove 方法
- 封装 chrome.storage.local 的 get/set，提供默认值

### `entrypoints/background.ts`
- 注册右键菜单（"标记为垃圾网站"）
- `contextMenus.onClicked` → extractDomain → storage.add
- `tabs.onUpdated` → 判断是否搜索引擎页面 → scripting.executeScript 注入 content script
- 只在 `changeInfo.status === 'complete'` 时注入，避免重复执行

### `entrypoints/content.ts`
- 获取当前页面搜索引擎配置
- 读取 blocked domains
- 遍历匹配的搜索结果卡片，隐藏匹配域名的项
- 使用 MutationObserver 处理动态加载的搜索结果
- try/catch 兜底，防止屏蔽逻辑出错影响页面正常使用

### `entrypoints/popup/App.svelte`
- 在当前网站启用/禁用 checkbox（绑定 storage）
- 当前页面拦截次数
- 拦截总数
- "设置"按钮跳转 options 页面
- 响应式绑定 storage，数据变更自动更新

### `entrypoints/options/App.svelte`
- 当前屏蔽域名列表（每项显示域名 + 删除按钮）
- 添加域名输入框 + 按钮
- 列表为空时显示提示文案
- 添加 / 删除操作即时更新

## 数据流

```
用户右键点击 → background.onClicked
                    ↓
            storage.add(url)
                    ↓
     ┌─────────────────────────────────┐
     │  content.ts 读取 storage        │
     │  → 匹配搜索引擎选择器           │
     │  → 遍历结果卡片 → 隐藏匹配域名  │
     └─────────────────────────────────┘
                    ↓
     ┌─────────────────────────────────┐
     │  popup/options 读取 storage     │
     │  → 显示统计/管理列表            │
     │  → 用户增删 → 写入 storage      │
     └─────────────────────────────────┘
```

## 边界情况处理

- **URL 解析失败**（`new URL()` 抛异常）→ 返回 null，不阻塞流程
- **非搜索引擎页面** → background 跳过注入，content 不执行
- **storage 为空或损坏** → 默认空数组
- **搜索结果动态加载** → MutationObserver 观察
- **右键菜单点击时 tab 为空** → 安全守卫返回
- **域名重复** → 添加时去重

## 不纳入本次重构的内容

- manifest.json 中已新增的大众点评 content scripts（与搜索屏蔽无关）
- 测试（可后续添加）
- CI/CD
- 多语言支持
