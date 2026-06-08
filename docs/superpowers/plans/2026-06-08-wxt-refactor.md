# WXT + TypeScript + Svelte 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Search Result Blocker Chrome 扩展从原生 JS + HTML 迁移到 WXT + TypeScript + Svelte

**Architecture:** WXT 作为扩展框架管理构建和 manifest，TypeScript 提供类型安全，Svelte 渲染 popup/options UI。三个工具模块 (domain/search-engines/storage) 被 background/content/popup/options 共享。

**Tech Stack:** WXT, TypeScript, Svelte 5, Vite, chrome.storage API

---

## 文件结构

```
search-result-blocker/
├── entrypoints/
│   ├── background.ts              # Service Worker
│   ├── content.ts                 # 搜索结果页屏蔽脚本
│   ├── popup/
│   │   ├── index.html             # HTML 外壳
│   │   └── App.svelte             # Popup 组件
│   └── options/
│       ├── index.html             # HTML 外壳
│       └── App.svelte             # 设置页组件
├── utils/
│   ├── domain.ts                  # 域名提取
│   ├── search-engines.ts          # 搜索引擎配置
│   └── storage.ts                 # chrome.storage 封装
├── assets/                        # 保留原有图标
├── public/icons/                  # WXT 静态资源
├── docs/                          # 设计文档
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── .gitignore
```

---

### Task 1: 初始化 WXT 项目

**Files:**
- Create: `package.json`
- Create: `wxt.config.ts`
- Create: `tsconfig.json`
- Create: `.gitignore` (更新)
- Create: `public/icons/` (复制 assets 中的图标)

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "search-result-blocker",
  "private": true,
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "postinstall": "wxt prepare",
    "dev:prepare": "wxt prepare"
  },
  "devDependencies": {
    "wxt": "^1.0.0",
    "@wxt-dev/module-svelte": "^1.0.0",
    "typescript": "^5.6.0",
    "svelte": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 wxt.config.ts**

```typescript
import { defineConfig } from 'wxt';
import { svelte } from '@wxt-dev/module-svelte';

export default defineConfig({
  modules: [svelte()],
  manifest: {
    name: 'Search Result Blocker',
    description: 'Block unwanted search results by domain',
    version: '0.2.0',
    permissions: ['contextMenus', 'storage', 'scripting', 'tabs', 'activeTab'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_popup: '/popup.html',
    },
    icons: {
      '16': '/icons/icon-16.png',
      '32': '/icons/icon-32.png',
      '180': '/icons/icon-180.png',
    },
  },
});
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["wxt/client"]
  },
  "include": ["entrypoints/**/*", "utils/**/*"]
}
```

- [ ] **Step 4: 更新 .gitignore**

追加 WXT 输出目录：
```
node_modules/
.output/
*.zip
.DS_Store
```

- [ ] **Step 5: 复制图标到 public/icons/**

```bash
mkdir -p public/icons
cp assets/icon-16.png public/icons/
cp assets/icon-32.png public/icons/
cp assets/icon-180.png public/icons/
```

- [ ] **Step 6: 安装依赖**

```bash
npm install
```

Expected: 依赖安装完成，无报错。

- [ ] **Step 7: 提交**

```bash
git add package.json wxt.config.ts tsconfig.json .gitignore public/
git commit -m "chore: initialize WXT project scaffold"
```

---

### Task 2: 创建工具模块

**Files:**
- Create: `utils/domain.ts`
- Create: `utils/search-engines.ts`
- Create: `utils/storage.ts`

- [ ] **Step 1: 创建 utils/domain.ts**

```typescript
/**
 * 从 URL 中提取域名（不含 www. 前缀）
 * 使用标准 URL API 替代简陋的正则匹配
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 创建 utils/search-engines.ts**

```typescript
export interface SearchEngine {
  name: string;
  hostname: string;
  selector: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { name: 'Google', hostname: 'www.google.com', selector: '#search .g' },
  { name: 'Baidu', hostname: 'www.baidu.com', selector: '#content_left .result' },
  { name: 'Bing', hostname: 'www.bing.com', selector: '#b_results .b_algo' },
  { name: 'DuckDuckGo', hostname: 'duckduckgo.com', selector: '.result' },
];

/**
 * 匹配 URL 对应的搜索引擎
 */
export function detectSearchEngine(url: string): SearchEngine | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return SEARCH_ENGINES.find((e) => e.hostname === hostname) ?? null;
  } catch {
    return null;
  }
}

/**
 * 检查是否为搜索引擎页面
 */
export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}
```

- [ ] **Step 3: 创建 utils/storage.ts**

```typescript
export interface ExtensionStorage {
  urls: string[];
  blockCount: number;
  enabled: boolean;
}

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockCount: 0,
  enabled: true,
};

type Listener = (value: ExtensionStorage) => void;
const listeners = new Set<Listener>();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  get().then((v) => listeners.forEach((fn) => fn(v)));
});

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function get(): Promise<ExtensionStorage> {
  try {
    const result = await chrome.storage.local.get('blocker');
    if (result.blocker && typeof result.blocker === 'object') {
      return { ...DEFAULT, ...result.blocker };
    }
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function set(partial: Partial<ExtensionStorage>): Promise<void> {
  const current = await get();
  await chrome.storage.local.set({ blocker: { ...current, ...partial } });
}

export async function addDomain(domain: string): Promise<void> {
  const { urls } = await get();
  if (!urls.includes(domain)) {
    await set({ urls: [...urls, domain] });
  }
}

export async function removeDomain(index: number): Promise<void> {
  const { urls } = await get();
  urls.splice(index, 1);
  await set({ urls });
}

export async function incrementBlockCount(): Promise<void> {
  const { blockCount } = await get();
  await set({ blockCount: blockCount + 1 });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await set({ enabled });
}
```

- [ ] **Step 4: 提交**

```bash
git add utils/
git commit -m "feat: add utility modules (domain, search-engines, storage)"
```

---

### Task 3: 创建 background Service Worker

**Files:**
- Create: `entrypoints/background.ts`

- [ ] **Step 1: 创建 entrypoints/background.ts**

```typescript
import { extractDomain } from '../utils/domain';
import { isSearchEngine } from '../utils/search-engines';
import { addDomain, get } from '../utils/storage';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    type: 'normal',
    title: '标记为垃圾网站',
    id: 'block-site',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'block-site') return;
  if (!tab?.url) return;

  try {
    const { enabled } = await get();
    if (!enabled) return;

    const domain = extractDomain(tab.url);
    if (domain) {
      await addDomain(domain);
    }
  } catch (err) {
    console.error('[SRB] Failed to block domain:', err);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab?.url || !isSearchEngine(tab.url)) return;

  get().then(({ enabled }) => {
    if (!enabled) return;
    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      })
      .catch(() => {});
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add entrypoints/background.ts
git commit -m "feat: add background service worker"
```

---

### Task 4: 创建 content script（含 MutationObserver）

**Files:**
- Create: `entrypoints/content.ts`

- [ ] **Step 1: 创建 entrypoints/content.ts**

```typescript
import { detectSearchEngine } from '../utils/search-engines';
import { get, incrementBlockCount, subscribe } from '../utils/storage';

let blockedDomains: string[] = [];
let isEnabled = true;

function detachResultItem(result: Element): boolean {
  if (!isEnabled) return false;
  try {
    const linkEl = result.querySelector('cite, .cite, a[href]');
    if (!linkEl) return false;
    const text = linkEl.textContent ?? linkEl.getAttribute('href') ?? '';
    return blockedDomains.some((domain) => text.includes(domain));
  } catch {
    return false;
  }
}

function blockResults(engine: ReturnType<typeof detectSearchEngine>): void {
  if (!engine || !isEnabled) return;
  let blocked = 0;
  try {
    const results = document.querySelectorAll(engine.selector);
    results.forEach((result) => {
      if (detachResultItem(result)) {
        (result as HTMLElement).style.display = 'none';
        blocked++;
      }
    });
    if (blocked > 0) {
      incrementBlockCount();
    }
  } catch (err) {
    console.error('[SRB] Error blocking results:', err);
  }
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function init(): void {
  const engine = detectSearchEngine(window.location.href);
  if (!engine) return;

  blockResults(engine);

  const container = document.querySelector(engine.selector.split(' ')[0]) ?? document.body;
  const observer = new MutationObserver(
    debounce(() => blockResults(engine), 300)
  );
  observer.observe(container, { childList: true, subtree: true });
}

subscribe((storage) => {
  blockedDomains = storage.urls;
  isEnabled = storage.enabled;
});

get().then((storage) => {
  blockedDomains = storage.urls;
  isEnabled = storage.enabled;
  init();
});
```

- [ ] **Step 2: 提交**

```bash
git add entrypoints/content.ts
git commit -m "feat: add content script with MutationObserver"
```

---

### Task 5: 创建 Popup 页面（Svelte）

**Files:**
- Create: `entrypoints/popup/index.html`
- Create: `entrypoints/popup/App.svelte`

- [ ] **Step 1: 创建 entrypoints/popup/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Search Result Blocker</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./App.svelte"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 entrypoints/popup/App.svelte**

```svelte
<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let blockCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;

  function getCurrentTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
  }

  async function loadData() {
    const tab = await getCurrentTab();
    const storage = await get();
    urls = storage.urls;
    blockCount = storage.blockCount;
    enabled = storage.enabled;
    if (tab?.url) {
      const domain = extractDomain(tab.url);
      currentSiteBlocked = domain ? urls.includes(domain) : false;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.runtime.openOptionsPage?.();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <section>
    <label>
      <input type="checkbox" checked={enabled} onclick={toggleEnabled} />
      启用
    </label>
  </section>
  <section>拦截总数：{blockCount}</section>
  {#if currentSiteBlocked}
    <section style="color: #c00;">当前网站已被屏蔽</section>
  {/if}
  <button onclick={openOptions}>设置</button>
</main>

<style>
  :global(body) {
    width: 280px;
    margin: 0;
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  }
  main { display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  button {
    margin-top: 4px; padding: 6px 16px;
    border: 1px solid #ccc; border-radius: 4px;
    background: #fff; cursor: pointer;
  }
  button:hover { background: #f5f5f5; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add entrypoints/popup/
git commit -m "feat: add popup Svelte page"
```

---

### Task 6: 创建 Options 设置页（Svelte）

**Files:**
- Create: `entrypoints/options/index.html`
- Create: `entrypoints/options/App.svelte`

- [ ] **Step 1: 创建 entrypoints/options/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Search Result Blocker - Settings</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./App.svelte"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 entrypoints/options/App.svelte**

```svelte
<script lang="ts">
  import { get, addDomain, removeDomain, subscribe } from '../../utils/storage';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let inputValue = '';
  let errorMsg = '';

  function isValidDomain(value: string): boolean {
    try {
      const url = value.startsWith('http') ? value : `https://${value}`;
      const parsed = new URL(url);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }

  async function loadData() {
    const storage = await get();
    urls = storage.urls;
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;
    // 提取域名
    const domain = value.startsWith('http')
      ? new URL(value).hostname.replace(/^www\./, '')
      : value.replace(/^www\./, '');
    if (!isValidDomain(domain)) {
      errorMsg = '请输入有效的域名';
      return;
    }
    errorMsg = '';
    await addDomain(domain);
    inputValue = '';
    await loadData();
  }

  async function handleRemove(index: number) {
    await removeDomain(index);
    await loadData();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <h1>屏蔽域名管理</h1>
  <div class="input-row">
    <input
      type="text"
      id="input"
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder="输入域名，如 example.com"
    />
    <button onclick={handleAdd}>添加域名</button>
  </div>
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {/if}
  {#if urls.length === 0}
    <p class="empty">暂无屏蔽域名</p>
  {:else}
    <ol>
      {#each urls as url, i}
        <li>
          <span>{url}</span>
          <button class="remove" onclick={() => handleRemove(i)}>删除</button>
        </li>
      {/each}
    </ol>
  {/if}
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 20px;
    max-width: 500px;
    margin: 0 auto;
  }
  h1 { font-size: 18px; margin-bottom: 16px; }
  .input-row { display: flex; gap: 8px; margin-bottom: 8px; }
  input {
    flex: 1; padding: 6px 10px;
    border: 1px solid #ccc; border-radius: 4px;
  }
  button {
    padding: 6px 16px;
    border: 1px solid #ccc; border-radius: 4px;
    background: #fff; cursor: pointer;
  }
  button:hover { background: #f0f0f0; }
  .error { color: #c00; font-size: 12px; margin-bottom: 8px; }
  .empty { color: #999; font-style: italic; }
  ol { padding-left: 24px; }
  li { margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .remove { color: #c00; border-color: #c00; }
  .remove:hover { background: #fff0f0; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add entrypoints/options/
git commit -m "feat: add options settings page with Svelte"
```

---

### Task 7: 清理旧文件并构建验证

**Files:**
- Delete: `js/`, `views/`, `css/` (旧版文件)
- Modify: 检查 `manifest.json` 是否存在（WXT 接管后不应保留）
- Verify: `npm run build`

- [ ] **Step 1: 删除旧的 JS/HTML/CSS 文件**

```bash
git rm -r js/ views/ css/
```

- [ ] **Step 2: 删除旧的 manifest.json（已被 WXT 接管）**

```bash
git rm manifest.json
```

- [ ] **Step 3: 执行构建验证**

```bash
npm run build
```

Expected: 构建成功，`.output/` 目录生成完整的扩展包。

- [ ] **Step 4: 确认构建产物目录结构**

```bash
ls -la .output/
```

Expected: 包含 `background.js`, `content-scripts/content.js`, `popup.html`, `options.html` 及图标。

- [ ] **Step 5: 查看 WXT 生成的 manifest**

```bash
cat .output/manifest.json
```

确认: `name` 为 "Search Result Blocker"，`permissions` 包含 contextMenus/storage/scripting/tabs/activeTab，`default_popup` 指向 popup.html。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: remove old files, verify WXT build"
```

---

## 验证检查清单

构建完成后，在 Chrome 中加载 `.output/` 目录测试：

- [ ] 右键菜单出现"标记为垃圾网站"
- [ ] 点击右键 → 域名存入 storage
- [ ] 在 Google 搜索 → 匹配域名结果被隐藏
- [ ] Popup 弹出 → 显示拦截总数、启用开关
- [ ] Options 页面 → 域名列表展示、添加、删除
- [ ] 禁用开关 → 搜索结果不再被屏蔽
