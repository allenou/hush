# 搜索结果屏蔽增强 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Search Result Blocker 增加 hover 屏蔽按钮、已屏蔽徽标、Teaching Mode、Badge 计数、统计趋势等 8 个功能模块

**Architecture:** Storage 层扩展支持 URL 级别屏蔽和统计 → SearchEngine 类型升级拆分为 container/item/link 三选择器 → Content Script 重写为双状态（屏蔽按钮/已屏蔽徽标）+ Teaching Mode 独立模式

**Tech Stack:** WXT 0.20 + TypeScript + Svelte 5

---

## 文件结构变化

```
utils/
├── storage.ts          ← 新增 blockedUrls/stats/customEngines 字段和方法
├── search-engines.ts   ← 升级 SearchEngineConfig 格式（三选择器拆分）
entrypoints/
├── background.ts       ← 新增 badge 计数
├── content.ts          ← 重写：hover按钮 + badge + 折叠条 + Teaching Mode
├── popup/App.svelte    ← 新增拦截统计趋势图
└── options/App.svelte  ← 新增 URL 管理 + 自定义引擎管理
```

---

### Task 1: Storage + SearchEngine 类型扩展

**Files:**
- Modify: `utils/storage.ts`
- Modify: `utils/search-engines.ts`

- [ ] **Step 1: 升级 search-engines.ts — SearchEngine → SearchEngineConfig**

```typescript
export interface SearchEngineConfig {
  name: string;
  hostname: string;
  containerSelector: string;   // 容器，如 '#search'
  itemSelector: string;        // 单条结果，如 '.g'
  linkSelector: string;        // 链接，如 'a[href]'
}

export const BUILT_IN_ENGINES: SearchEngineConfig[] = [
  {
    name: 'Google',
    hostname: 'www.google.com',
    containerSelector: '#search',
    itemSelector: '.g',
    linkSelector: 'a[href]',
  },
  {
    name: 'Baidu',
    hostname: 'www.baidu.com',
    containerSelector: '#content_left',
    itemSelector: '.result',
    linkSelector: 'a[href]',
  },
  {
    name: 'Bing',
    hostname: 'www.bing.com',
    containerSelector: '#b_results',
    itemSelector: '.b_algo',
    linkSelector: 'a[href]',
  },
  {
    name: 'DuckDuckGo',
    hostname: 'duckduckgo.com',
    containerSelector: '.results',
    itemSelector: '.result',
    linkSelector: 'a[href]',
  },
];

export function detectSearchEngine(url: string): SearchEngineConfig | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ?? null;
  } catch {
    return null;
  }
}

export function isSearchEngine(url: string): boolean {
  return detectSearchEngine(url) !== null;
}
```

- [ ] **Step 2: 扩展 storage.ts — 新增类型、字段、方法**

```typescript
import { type SearchEngineConfig } from './search-engines';

export interface ExtensionStorage {
  urls: string[];               // 域名屏蔽列表
  blockedUrls: string[];        // 精确 URL 屏蔽列表
  blockCount: number;           // 总拦截次数
  enabled: boolean;             // 全局开关
  customEngines: SearchEngineConfig[];  // 用户自学习搜索引擎
  stats: BlockStats[];          // 每日拦截统计
}

export interface BlockItem {
  type: 'domain' | 'url';
  value: string;
  index: number;                // 在原始数组中的索引
}

export interface BlockStats {
  date: string;                 // '2026-06-08'
  count: number;
}

const DEFAULT: ExtensionStorage = {
  urls: [],
  blockedUrls: [],
  blockCount: 0,
  enabled: true,
  customEngines: [],
  stats: [],
};

// （保留原有的 get、set、subscribe、addDomain、removeDomain 不变）
// 新增以下方法：

export async function addBlockedUrl(url: string): Promise<void> {
  const { blockedUrls } = await get();
  if (!blockedUrls.includes(url)) {
    await set({ blockedUrls: [...blockedUrls, url] });
  }
}

export async function removeBlockedUrl(index: number): Promise<void> {
  const { blockedUrls } = await get();
  blockedUrls.splice(index, 1);
  await set({ blockedUrls });
}

export async function removeBlockedItem(type: 'domain' | 'url', index: number): Promise<void> {
  if (type === 'domain') {
    await removeDomain(index);
  } else {
    await removeBlockedUrl(index);
  }
}

export async function getAllBlocked(): Promise<BlockItem[]> {
  const { urls, blockedUrls } = await get();
  const domains: BlockItem[] = urls.map((value, index) => ({ type: 'domain', value, index }));
  const urlsList: BlockItem[] = blockedUrls.map((value, index) => ({ type: 'url', value, index }));
  return [...domains, ...urlsList];
}

export async function addCustomEngine(config: SearchEngineConfig): Promise<void> {
  const { customEngines } = await get();
  const existing = customEngines.findIndex((e) => e.hostname === config.hostname);
  if (existing >= 0) {
    customEngines[existing] = config; // 更新已有配置
    await set({ customEngines });
  } else {
    await set({ customEngines: [...customEngines, config] });
  }
}

export async function removeCustomEngine(index: number): Promise<void> {
  const { customEngines } = await get();
  customEngines.splice(index, 1);
  await set({ customEngines });
}

export async function recordBlock(): Promise<void> {
  const { blockCount, stats } = await get();
  const today = new Date().toISOString().slice(0, 10); // '2026-06-08'
  const existing = stats.find((s) => s.date === today);
  if (existing) {
    existing.count++;
  } else {
    stats.push({ date: today, count: 1 });
  }
  // 保留最近 30 天
  const pruned = stats.slice(-30);
  await set({ blockCount: blockCount + 1, stats: pruned });
}
```

- [ ] **Step 3: 提交**

```bash
git add utils/storage.ts utils/search-engines.ts
git commit -m "feat: expand storage with blockedUrls, stats, customEngines; upgrade SearchEngineConfig"
```

---

### Task 2: Background badge 计数

**Files:**
- Modify: `entrypoints/background.ts`

- [ ] **Step 1: 重写 background.ts — 保留右键菜单 + 新增 badge**

```typescript
import { defineBackground } from 'wxt/utils/define-background';
import { extractDomain } from '../utils/domain';
import { addDomain, get } from '../utils/storage';

async function updateBadge(): Promise<void> {
  const { blockCount } = await get();
  const text = blockCount > 0 ? String(blockCount) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#c00' });
}

export default defineBackground(() => {
  // 初始化 badge
  updateBadge();

  // 监听 storage 变化更新 badge
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blocker) {
      updateBadge();
    }
  });

  // 右键菜单
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
      if (domain) await addDomain(domain);
    } catch (err) {
      console.error('[SRB] Failed to block domain:', err);
    }
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add entrypoints/background.ts
git commit -m "feat: add badge notification count"
```

---

### Task 3: Content script 重写 — Hover按钮 + 徽标 + 折叠条

**Files:**
- Modify: `entrypoints/content.ts`（完全重写）

- [ ] **Step 1: 重写 content.ts**

```typescript
import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  BUILT_IN_ENGINES,
  type SearchEngineConfig,
} from '../utils/search-engines';
import {
  get,
  addDomain,
  addBlockedUrl,
  removeBlockedItem,
  recordBlock,
  subscribe,
} from '../utils/storage';

export default defineContentScript({
  matches: ['<all_urls>'],  // 需要访问所有页面，因为 teaching mode 和用户配的自定义引擎
  runAt: 'document_end',
  main() {
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let isEnabled = true;
    let currentEngine: SearchEngineConfig | null = null;

    function getHostname(): string {
      return new URL(window.location.href).hostname.replace(/^www\./, '');
    }

    /** 获取搜索结果中全部可见链接的 URL */
    function getResultUrls(engine: SearchEngineConfig): string[] {
      const container = document.querySelector(engine.containerSelector);
      if (!container) return [];
      const items = container.querySelectorAll(engine.itemSelector);
      return Array.from(items).map((item) => {
        const link = item.querySelector<HTMLAnchorElement>(engine.linkSelector);
        return link?.href ?? '';
      }).filter(Boolean);
    }

    /** 注入 fold 提示条 */
    function injectCollapseBar(): void {
      const existing = document.getElementById('srb-collapse-bar');
      if (existing) return;
      const bar = document.createElement('div');
      bar.id = 'srb-collapse-bar';
      bar.style.cssText = `
        padding: 6px 12px; margin: 4px 0; font-size: 13px;
        background: #fff3cd; color: #856404; border-radius: 4px;
        display: none;
      `;
      const container = currentEngine
        ? document.querySelector(currentEngine.containerSelector)
        : document.body;
      (container ?? document.body).parentNode?.insertBefore(bar, container ?? null);
    }

    function updateCollapseBar(): void {
      const bar = document.getElementById('srb-collapse-bar');
      if (!bar) return;
      const count = document.querySelectorAll('.srb-blocked-badge').length;
      bar.textContent = `🚫 已屏蔽 ${count} 个低质量结果`;
      bar.style.display = count > 0 ? 'block' : 'none';
    }

    /** 为单个结果注入 ⊕ 按钮或已屏蔽徽标 */
    function processItem(item: Element, engine: SearchEngineConfig): void {
      if (item.hasAttribute('data-srb-processed')) return;
      item.setAttribute('data-srb-processed', 'true');

      const link = item.querySelector<HTMLAnchorElement>(engine.linkSelector);
      const href = link?.href ?? '';
      if (!href) return;

      // 检查是否已被屏蔽
      const domainMatch = blockedDomains.some((d) => href.includes(d));
      const urlMatch = blockedUrls.includes(href);

      if (domainMatch || urlMatch) {
        // 已屏蔽 → 注入徽标
        injectBadge(item, domainMatch, urlMatch, href);
        return;
      }

      // 未屏蔽 → 注入 ⊕ 按钮
      injectBlockButton(item, href, engine);
    }

    /** 注入屏蔽按钮 */
    function injectBlockButton(item: Element, href: string, engine: SearchEngineConfig): void {
      if (item.querySelector('.srb-block-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'srb-block-btn';
      btn.innerHTML = '⊕';
      btn.title = '屏蔽此结果';
      btn.style.cssText = `
        position: absolute; top: 4px; right: 4px; z-index: 9999;
        width: 22px; height: 22px; border: 1px solid #ccc;
        border-radius: 50%; background: #fff; cursor: pointer;
        font-size: 14px; line-height: 1; display: none;
        align-items: center; justify-content: center; padding: 0;
      `;

      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      const popup = document.createElement('div');
      popup.className = 'srb-popup';
      popup.style.cssText = `
        position: absolute; top: 28px; right: 0; z-index: 10000;
        background: #fff; border: 1px solid #ddd; border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: none;
        flex-direction: column; min-width: 140px;
      `;
      popup.innerHTML = `
        <button class="srb-opt-domain" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;">屏蔽此域名</button>
        <button class="srb-opt-url" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;border-top:1px solid #eee;">屏蔽此链接</button>
      `;

      // hover 显示按钮
      item.addEventListener('mouseenter', () => { btn.style.display = 'flex'; });
      item.addEventListener('mouseleave', (e) => {
        if (!popup.contains(e.relatedTarget as Node) && e.relatedTarget !== btn) {
          btn.style.display = 'none';
          popup.style.display = 'none';
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
      });

      popup.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const domain = new URL(href).hostname.replace(/^www\./, '');

        if (target.classList.contains('srb-opt-domain')) {
          await addDomain(domain);
        } else if (target.classList.contains('srb-opt-url')) {
          await addBlockedUrl(href);
        }
        await recordBlock();
        popup.style.display = 'none';
        btn.style.display = 'none';
        btn.remove();
        popup.remove();
        injectBadge(item, true, target.classList.contains('srb-opt-url'), href);
        updateCollapseBar();
      });

      item.appendChild(btn);
      item.appendChild(popup);
    }

    /** 注入已屏蔽徽标 */
    function injectBadge(item: Element, _domainMatch: boolean, urlMatch: boolean, href: string): void {
      if (item.querySelector('.srb-blocked-badge')) return;

      const badge = document.createElement('div');
      badge.className = 'srb-blocked-badge';
      badge.textContent = '已屏蔽';
      badge.title = '点击取消屏蔽';
      badge.style.cssText = `
        position: absolute; top: 4px; right: 4px; z-index: 9999;
        padding: 2px 8px; border-radius: 4px;
        background: #e8e8e8; color: #666; font-size: 11px;
        cursor: pointer; user-select: none;
      `;

      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      badge.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        badge.remove();
        const currentDomains = blockedDomains;
        const domain = new URL(href).hostname.replace(/^www\./, '');
        const domainIdx = currentDomains.indexOf(domain);

        if (domainIdx >= 0 && !urlMatch) {
          // 仅域名匹配
          await removeBlockedItem('domain', domainIdx);
        } else if (urlMatch && domainIdx === -1) {
          // 仅 URL 匹配
          const urlIdx = blockedUrls.indexOf(href);
          if (urlIdx >= 0) await removeBlockedItem('url', urlIdx);
        } else if (domainIdx >= 0 && urlMatch) {
          // 两者都匹配 → 弹出选择
          const choice = confirm('取消屏蔽此域名？\n确定=是，取消=仅取消此链接');
          if (choice) {
            await removeBlockedItem('domain', domainIdx);
          } else {
            const urlIdx = blockedUrls.indexOf(href);
            if (urlIdx >= 0) await removeBlockedItem('url', urlIdx);
          }
        }
        updateCollapseBar();
      });

      item.appendChild(badge);
    }

    /** 主循环 */
    function scanResults(engine: SearchEngineConfig): void {
      if (!isEnabled) return;
      const container = document.querySelector(engine.containerSelector);
      if (!container) return;
      const items = container.querySelectorAll(engine.itemSelector);
      items.forEach((item) => processItem(item, engine));
      updateCollapseBar();
    }

    const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      }) as T;
    };

    async function init(): Promise<void> {
      const hostname = getHostname();
      // 合并内置引擎和自定义引擎
      const { customEngines } = await get();
      currentEngine =
        BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ??
        customEngines.find((e) => e.hostname === hostname) ??
        null;
      if (!currentEngine) return;

      injectCollapseBar();
      scanResults(currentEngine);

      const container = document.querySelector(currentEngine.containerSelector) ?? document.body;
      const observer = new MutationObserver(debounce(() => scanResults(currentEngine!), 300));
      observer.observe(container, { childList: true, subtree: true });
    }

    // 订阅 storage 变化
    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      if (currentEngine) {
        scanResults(currentEngine);
      }
    });

    // 初始化
    get().then(async (storage) => {  // ← 这里需要 async
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      await init();
    });
  },
});
```


- [ ] **Step 2: 更新 wxt.config.ts 的 host_permissions**

匹配 content script 的 `<all_urls>`：

```typescript
// wxt.config.ts 修改 host_permissions
host_permissions: ['<all_urls>'],
```

- [ ] **Step 3: 提交**

```bash
git add entrypoints/content.ts wxt.config.ts
git commit -m "feat: rewrite content script with hover block button, blocked badge, collapse bar"
```

---

### Task 4: Teaching Mode

**Files:**
- Modify: `entrypoints/content.ts`（追加 teaching mode 逻辑）
- Modify: `entrypoints/popup/App.svelte`（追加 teaching mode 触发入口）

- [ ] **Step 1: 在 content.ts 中追加 teaching mode**

在 `main()` 末尾追加：

```typescript
// ===== Teaching Mode =====
let isTeaching = false;

/** DOM 选择器自动生成 */
function generateSelector(el: Element): string | null {
  // 1. 向上找包含 3+ 相同结构子元素的容器
  let parent = el.parentElement;
  let container: Element | null = null;
  let itemTag = '';
  let itemClass = '';

  while (parent && parent !== document.body) {
    const children = parent.children;
    const similar = Array.from(children).filter(
      (c) => c.tagName === el.tagName && c.className === el.className
    );
    if (similar.length >= 3) {
      container = parent;
      itemTag = el.tagName.toLowerCase();
      // 优先用 class
      const cls = el.className.trim();
      itemClass = cls ? cls.split(/\s+/).map((c) => `.${CSS.escape(c)}`).join('') : '';
      break;
    }
    parent = parent.parentElement;
    el = parent ?? el;
  }

  if (!container) return null;

  // 生成容器选择器
  let path = '';
  let current: Element | null = container;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${CSS.escape(current.id)}` : '';
    const cls = Array.from(current.classList)
      .slice(0, 2)
      .map((c) => `.${CSS.escape(c)}`)
      .join('');
    path = `${tag}${id}${cls} ${path}`.trim();
    current = current.parentElement;
  }
  const containerSelector = path.trim() || 'body';
  const itemSelector = `${itemTag}${itemClass}`;

  // 验证：选择器必须在容器中匹配 2+ 元素
  const containerEl = document.querySelector(containerSelector);
  if (!containerEl) return null;
  const matchCount = containerEl.querySelectorAll(itemSelector).length;
  if (matchCount < 2) return null;

  return JSON.stringify({ containerSelector, itemSelector, linkSelector: 'a[href]' });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'srb-start-teaching') {
    isTeaching = true;

    // 注入遮罩提示
    const overlay = document.createElement('div');
    overlay.id = 'srb-teaching-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.3); display: flex;
      align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `<div style="background:#fff;padding:20px 30px;border-radius:8px;font-size:16px;box-shadow:0 4px 20px rgba(0,0,0,0.2);">
      🎯 请点击任意一条搜索结果
    </div>`;
    document.body.appendChild(overlay);

    // 等待用户点击
    const handler = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      document.removeEventListener('click', handler, true);

      const result = generateSelector(e.target as Element);
      if (!result) {
        sendResponse({ success: false, error: '无法识别搜索结果结构，请重试' });
        isTeaching = false;
        return;
      }

      const config = {
        ...JSON.parse(result),
        name: '',
        hostname: getHostname(),
      };
      sendResponse({ success: true, config });
      isTeaching = false;
    };
    document.addEventListener('click', handler, true);
    return true; // 保持通道打开
  }
});
```

- [ ] **Step 2: 修改 popup/App.svelte 添加 teaching mode 入口**

```svelte
<script lang="ts">
  import { get, setEnabled, subscribe } from '../../utils/storage';
  import { extractDomain } from '../../utils/domain';
  import { BUILT_IN_ENGINES } from '../../utils/search-engines';
  import { onMount } from 'svelte';

  let urls: string[] = [];
  let blockCount = 0;
  let enabled = true;
  let currentSiteBlocked = false;
  let showTeaching = false;
  let teachingName = '';
  let pendingConfig: any = null;
  let teachingError = '';
  let teachingStep: 'idle' | 'clicking' | 'naming' | 'done' = 'idle';

  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
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
      // 检查当前页是否已知搜索引擎
      const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
      const known = [...BUILT_IN_ENGINES, ...(storage.customEngines ?? [])]
        .some((e) => e.hostname === hostname);
      showTeaching = !known;
    }
  }

  async function toggleEnabled() {
    enabled = !enabled;
    await setEnabled(enabled);
  }

  function openOptions() {
    chrome.runtime.openOptionsPage?.();
  }

  async function startTeaching() {
    const tab = await getCurrentTab();
    if (!tab?.id) return;
    teachingStep = 'clicking';
    teachingError = '';

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'srb-start-teaching' });
      if (response?.success) {
        pendingConfig = response.config;
        teachingStep = 'naming';
      } else {
        teachingError = response?.error || '识别失败，请重试';
        teachingStep = 'idle';
      }
    } catch {
      teachingError = '无法与此页面通信，请刷新后重试';
      teachingStep = 'idle';
    }
  }

  async function saveEngine() {
    if (!teachingName.trim() || !pendingConfig) return;
    pendingConfig.name = teachingName.trim();
    // 发送到 background 保存
    // 直接使用 storage 保存
    const { customEngines } = await get();
    const existing = customEngines.findIndex((e) => e.hostname === pendingConfig.hostname);
    if (existing >= 0) {
      customEngines[existing] = pendingConfig;
    } else {
      customEngines.push(pendingConfig);
    }
    await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
    teachingStep = 'done';
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

  {#if showTeaching && teachingStep === 'idle'}
    <section class="teaching">
      <span>此搜索引擎还不认识</span>
      <button class="btn-teach" onclick={startTeaching}>教我识别</button>
    </section>
  {/if}

  {#if teachingStep === 'clicking'}
    <section style="color: #28a745;">请在搜索结果页点击一条结果...</section>
  {/if}

  {#if teachingError}
    <section style="color: #c00; font-size: 12px;">{teachingError}</section>
  {/if}

  {#if teachingStep === 'naming'}
    <section>
      <input type="text" bind:value={teachingName} placeholder="给这个搜索引擎起个名字" />
      <button onclick={saveEngine}>保存</button>
    </section>
  {/if}

  {#if teachingStep === 'done'}
    <section style="color: #28a745;">✅ 已学会！请刷新页面生效</section>
  {/if}

  <button onclick={openOptions}>设置</button>
</main>

<style>
  :global(body) {
    width: 300px; margin: 0; padding: 12px;
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
  .teaching { display: flex; align-items: center; gap: 8px; }
  .btn-teach { background: #007bff; color: #fff; border-color: #007bff; }
  .btn-teach:hover { background: #0056b3; }
  input { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add entrypoints/content.ts entrypoints/popup/App.svelte
git commit -m "feat: add teaching mode for unknown search engines"
```

---

### Task 5: Options 页面改造 — URL列表 + 自定义搜索引擎

**Files:**
- Modify: `entrypoints/options/App.svelte`

- [ ] **Step 1: 重写 options/App.svelte**

```svelte
<script lang="ts">
  import { get, getAllBlocked, removeBlockedItem, addCustomEngine, removeCustomEngine, subscribe, addDomain, addBlockedUrl } from '../../utils/storage';
  import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../../utils/search-engines';
  import { onMount } from 'svelte';

  let blockedItems: { type: 'domain' | 'url'; value: string; index: number }[] = [];
  let inputValue = '';
  let errorMsg = '';
  let customEngines: SearchEngineConfig[] = [];

  // 自定义引擎表单
  let newEngineName = '';
  let newEngineHostname = '';
  let newEngineContainer = '';
  let newEngineItem = '';
  let newEngineLink = '';

  async function loadData() {
    blockedItems = await getAllBlocked();
    const storage = await get();
    customEngines = storage.customEngines ?? [];
  }

  async function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;
    const domain = value.startsWith('http')
      ? new URL(value).hostname.replace(/^www\./, '')
      : value.replace(/^www\./, '');
    try {
      new URL(domain.startsWith('http') ? domain : `https://${domain}`);
      // 如果是完整 URL 带路径
      if (value.startsWith('http') && new URL(value).pathname !== '/') {
        await addBlockedUrl(value);
      } else {
        await addDomain(domain);
      }
      inputValue = '';
      await loadData();
    } catch {
      errorMsg = '请输入有效的域名或 URL';
    }
  }

  async function handleRemove(item: { type: 'domain' | 'url'; index: number }) {
    await removeBlockedItem(item.type, item.index);
    await loadData();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  async function handleAddEngine() {
    if (!newEngineName || !newEngineHostname || !newEngineContainer || !newEngineItem) {
      errorMsg = '请填写所有必填字段';
      return;
    }
    const config: SearchEngineConfig = {
      name: newEngineName,
      hostname: newEngineHostname.replace(/^www\./, ''),
      containerSelector: newEngineContainer,
      itemSelector: newEngineItem,
      linkSelector: newEngineLink || 'a[href]',
    };
    await addCustomEngine(config);
    newEngineName = newEngineHostname = newEngineContainer = newEngineItem = newEngineLink = '';
    errorMsg = '';
    await loadData();
  }

  async function handleRemoveEngine(index: number) {
    await removeCustomEngine(index);
    await loadData();
  }

  onMount(() => {
    loadData();
    return subscribe(() => loadData());
  });
</script>

<main>
  <h1>屏蔽域名/链接 管理</h1>
  <div class="input-row">
    <input type="text" bind:value={inputValue} onkeydown={handleKeydown}
      placeholder="输入域名或完整 URL，如 example.com 或 https://..." />
    <button onclick={handleAdd}>添加</button>
  </div>
  {#if errorMsg}
    <p class="error">{errorMsg}</p>
  {/if}

  {#if blockedItems.length === 0}
    <p class="empty">暂无屏蔽内容</p>
  {:else}
    <ol>
      {#each blockedItems as item}
        <li>
          <span class="badge-type">{item.type === 'domain' ? '🌐' : '🔗'}</span>
          <span class="value">{item.value}</span>
          <button class="remove" onclick={() => handleRemove(item)}>删除</button>
        </li>
      {/each}
    </ol>
  {/if}

  <hr />

  <h2>已配置的搜索引擎</h2>
  {#each BUILT_IN_ENGINES as engine}
    <div class="engine-row">
      <span class="engine-name">{engine.name}</span>
      <span class="engine-host">({engine.hostname})</span>
      <span class="builtin-tag">内置</span>
    </div>
  {/each}
  {#each customEngines as engine, i}
    <div class="engine-row">
      <span class="engine-name">{engine.name}</span>
      <span class="engine-host">({engine.hostname})</span>
      <button class="remove" onclick={() => handleRemoveEngine(i)}>删除</button>
    </div>
  {/each}

  <details>
    <summary>手动添加搜索引擎</summary>
    <div class="engine-form">
      <input bind:value={newEngineName} placeholder="名称（如 我的搜索）" />
      <input bind:value={newEngineHostname} placeholder="hostname（如 search.example.com）" />
      <input bind:value={newEngineContainer} placeholder="容器选择器（如 #search）" />
      <input bind:value={newEngineItem} placeholder="结果选择器（如 .result-item）" />
      <input bind:value={newEngineLink} placeholder="链接选择器（默认 a[href]）" />
      <button onclick={handleAddEngine}>添加</button>
    </div>
  </details>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; padding: 20px; max-width: 600px; margin: 0 auto;
  }
  h1 { font-size: 18px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin: 20px 0 10px; }
  .input-row { display: flex; gap: 8px; margin-bottom: 8px; }
  input { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; }
  button { padding: 6px 16px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; }
  button:hover { background: #f0f0f0; }
  .error { color: #c00; font-size: 12px; }
  .empty { color: #999; font-style: italic; }
  ol { padding-left: 0; list-style: none; }
  li { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 6px 8px; background: #f9f9f9; border-radius: 4px; }
  .badge-type { font-size: 14px; }
  .value { flex: 1; word-break: break-all; }
  .remove { color: #c00; border-color: #c00; padding: 2px 10px; }
  .remove:hover { background: #fff0f0; }
  .engine-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; }
  .engine-name { font-weight: 500; }
  .engine-host { color: #666; font-size: 12px; }
  .builtin-tag { font-size: 11px; color: #999; background: #eee; padding: 1px 6px; border-radius: 3px; }
  .engine-form { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
  details { margin-top: 12px; }
  summary { cursor: pointer; color: #007bff; font-size: 13px; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add entrypoints/options/App.svelte
git commit -m "feat: redesign options page with URL management and custom engine config"
```

---

### Task 6: Popup 拦截统计

**Files:**
- Modify: `entrypoints/popup/App.svelte`

- [ ] **Step 1: 在 popup 中追加统计条**

在 `teachingStep === 'done'` 的 `{#if}` 块之后、`<button>` 之前插入：

```svelte
  {#if stats.length > 0}
    <section class="stats">
      <h3>拦截趋势（近 7 天）</h3>
      <div class="chart">
        {#each stats.slice(-7) as day}
          <div class="bar-wrapper" title="{day.date}: {day.count} 次">
            <div class="bar" style="height: {Math.max(day.count * 4, 2)}px;"></div>
            <span class="label">{new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}
```

并在 `<script>` 中添加 stats 变量和加载逻辑：

```typescript
let stats: { date: string; count: number }[] = [];

// 在 loadData 中：
stats = (storage.stats ?? []).slice(-7);
```

以及在 `<style>` 中添加：

```css
  .stats { margin-top: 8px; }
  .stats h3 { font-size: 12px; margin: 0 0 6px; color: #666; }
  .chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
  .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .bar { width: 100%; background: #c00; border-radius: 2px 2px 0 0; min-height: 2px; }
  .label { font-size: 9px; color: #999; }
```

- [ ] **Step 2: 提交**

```bash
git add entrypoints/popup/App.svelte
git commit -m "feat: add block stats bar chart to popup"
```

---

### Task 7: 构建验证

- [ ] **Step 1: 构建**

```bash
npm run build
```

Expected: 构建成功，无报错。

- [ ] **Step 2: 检查产物 manifest**

```bash
cat .output/chrome-mv3/manifest.json
```

确认：permissions 包含 storage/contextMenus/activeTab，content_scripts matches 包含 `<all_urls>`。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "chore: build and verify enhancement features"
```
