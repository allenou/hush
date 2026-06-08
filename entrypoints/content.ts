import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../utils/search-engines';
import {
  get,
  addDomain,
  addBlockedUrl,
  removeBlockedItem,
  recordBlock,
  subscribe,
} from '../utils/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let isEnabled = true;
    let currentEngine: SearchEngineConfig | null = null;

    function getHostname(): string {
      return new URL(window.location.href).hostname.replace(/^www\./, '');
    }

    function injectCollapseBar(): void {
      const existing = document.getElementById('srb-collapse-bar');
      if (existing) return;
      const bar = document.createElement('div');
      bar.id = 'srb-collapse-bar';
      bar.style.cssText = 'padding:6px 12px;margin:4px 0;font-size:13px;background:#fff3cd;color:#856404;border-radius:4px;display:none;';
      const c = currentEngine ? document.querySelector(currentEngine.containerSelector) : document.body;
      (c ?? document.body).parentNode?.insertBefore(bar, c ?? null);
    }

    function updateCollapseBar(): void {
      const bar = document.getElementById('srb-collapse-bar');
      if (!bar) return;
      const count = document.querySelectorAll('.srb-blocked-badge').length;
      bar.textContent = '🚫 已屏蔽 ' + count + ' 个低质量结果';
      bar.style.display = count > 0 ? 'block' : 'none';
    }

    function processItem(item: Element): void {
      if (item.hasAttribute('data-srb-processed')) return;
      item.setAttribute('data-srb-processed', 'true');
      const engine = currentEngine;
      if (!engine) return;
      const link = item.querySelector<HTMLAnchorElement>(engine.linkSelector);
      const href = link?.href ?? '';
      if (!href) return;
      const domainMatch = blockedDomains.some((d) => href.includes(d));
      const urlMatch = blockedUrls.includes(href);
      if (domainMatch || urlMatch) {
        injectBadge(item, domainMatch, urlMatch, href);
      } else {
        injectBlockButton(item, href);
      }
    }

    function injectBlockButton(item: Element, href: string): void {
      if (item.querySelector('.srb-block-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'srb-block-btn';
      btn.innerHTML = '⊕';
      btn.title = '屏蔽此结果';
      btn.style.cssText = 'position:absolute;top:4px;right:4px;z-index:9999;width:22px;height:22px;border:1px solid #ccc;border-radius:50%;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:none;align-items:center;justify-content:center;padding:0;';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';
      const popup = document.createElement('div');
      popup.className = 'srb-popup';
      popup.style.cssText = 'position:absolute;top:28px;right:0;z-index:10000;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:none;flex-direction:column;min-width:140px;';
      popup.innerHTML = '<button class="srb-opt-domain" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;">屏蔽此域名</button><button class="srb-opt-url" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;border-top:1px solid #eee;">屏蔽此链接</button>';
      item.addEventListener('mouseenter', () => { btn.style.display = 'flex'; });
      item.addEventListener('mouseleave', (e) => {
        if (!popup.contains(e.relatedTarget as Node) && e.relatedTarget !== btn) { btn.style.display = 'none'; popup.style.display = 'none'; }
      });
      btn.addEventListener('click', (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; });
      popup.addEventListener('click', async (e) => {
        const t = e.target as HTMLElement;
        const domain = new URL(href).hostname.replace(/^www\./, '');
        if (t.classList.contains('srb-opt-domain')) await addDomain(domain);
        else if (t.classList.contains('srb-opt-url')) await addBlockedUrl(href);
        await recordBlock();
        popup.style.display = 'none';
        btn.style.display = 'none';
        btn.remove();
        popup.remove();
        injectBadge(item, true, t.classList.contains('srb-opt-url'), href);
        updateCollapseBar();
      });
      item.appendChild(btn);
      item.appendChild(popup);
    }

    function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
      if (item.querySelector('.srb-blocked-badge')) return;
      const badge = document.createElement('div');
      badge.className = 'srb-blocked-badge';
      badge.textContent = '已屏蔽';
      badge.title = '点击取消屏蔽';
      badge.style.cssText = 'position:absolute;top:4px;right:4px;z-index:9999;padding:2px 8px;border-radius:4px;background:#e8e8e8;color:#666;font-size:11px;cursor:pointer;user-select:none;';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';
      badge.addEventListener('click', async () => {
        badge.remove();
        const domain = new URL(href).hostname.replace(/^www\./, '');
        const di = blockedDomains.indexOf(domain);
        if (di >= 0 && !urlMatch) await removeBlockedItem('domain', di);
        else if (urlMatch && di === -1) { const ui = blockedUrls.indexOf(href); if (ui >= 0) await removeBlockedItem('url', ui); }
        else if (di >= 0 && urlMatch) {
          if (confirm('取消屏蔽此域名？\n确定=是，取消=仅取消此链接')) await removeBlockedItem('domain', di);
          else { const ui = blockedUrls.indexOf(href); if (ui >= 0) await removeBlockedItem('url', ui); }
        }
        updateCollapseBar();
      });
      item.appendChild(badge);
    }

    function scanResults(engine: SearchEngineConfig): void {
      if (!isEnabled) return;
      const container = document.querySelector(engine.containerSelector);
      if (!container) {
        console.log('[SRB] scanResults: container not found:', engine.containerSelector);
        // 容器不存在 → 可能是配置错误，重新检测
        setTimeout(() => { tryAutoDetect(); }, 500);
        return;
      }
      const items = container.querySelectorAll(engine.itemSelector);
      console.log('[SRB] scanResults: container', engine.containerSelector, 'itemSelector', engine.itemSelector, 'found', items.length, 'items');
      if (items.length === 0) {
        // Debug: 容器内子元素（可直接点击跳转页面位置）
        const children = container.children;
        console.log('[SRB] Container children:', children.length);
        for (let i = 0; i < Math.min(children.length, 8); i++) {
          const c = children[i] as Element;
          console.log('[SRB] child ' + i, c);
        }
      } else {
        console.log('[SRB] First 3 items:', items[0], items[1], items[2]);
      }
      items.forEach((item) => processItem(item));
      updateCollapseBar();
    }

    const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: unknown[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
    };

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();
      console.log('[SRB] Init on', hostname, 'built-in:', BUILT_IN_ENGINES.some((e) => e.hostname === hostname), 'custom:', customEngines.some((e) => e.hostname === hostname));
      injectFloatingBtn();
      currentEngine = BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ?? customEngines.find((e) => e.hostname === hostname) ?? null;
      if (!currentEngine) { console.log('[SRB] No engine found, will auto-detect in 2s'); return; }
      // 验证容器是否存在，不存在则从自定义引擎中移除
      if (!document.querySelector(currentEngine.containerSelector)) {
        console.log('[SRB] Saved config container not found, removing bad config');
        const idx = customEngines.findIndex((e) => e.hostname === hostname);
        if (idx >= 0) {
          customEngines.splice(idx, 1);
          await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
        }
        currentEngine = null;
        setTimeout(() => { tryAutoDetect(); }, 500);
        return;
      }
      console.log('[SRB] Engine found:', currentEngine.name, 'container:', currentEngine.containerSelector, 'item:', currentEngine.itemSelector);
      injectCollapseBar();
      scanResults(currentEngine);
      const c = document.querySelector(currentEngine.containerSelector) ?? document.body;
      new MutationObserver(debounce(() => { if (currentEngine) scanResults(currentEngine); }, 300)).observe(c, { childList: true, subtree: true });
    }

    function injectFloatingBtn(): void {
      if (document.getElementById('srb-float-btn')) return;
      const btn = document.createElement('div');
      btn.id = 'srb-float-btn';
      btn.innerHTML = '🛡';
      btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;width:48px;height:48px;border-radius:50%;background:#007bff;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);user-select:none;transition:transform 0.15s;';
      btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
      btn.onmouseleave = () => { btn.style.transform = ''; };
      const popup = document.createElement('div');
      popup.id = 'srb-float-popup';
      popup.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:none;flex-direction:column;min-width:160px;overflow:hidden;';
      popup.innerHTML = '<button class="srb-fopt" data-action="domain" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;border-bottom:1px solid #eee;">🌐 屏蔽此域名</button><button class="srb-fopt" data-action="url" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;">🔗 屏蔽此链接</button>';
      btn.onclick = (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; };
      popup.onclick = async (e) => {
        const t = e.target as HTMLElement;
        if (!t.classList.contains('srb-fopt')) return;
        if (t.getAttribute('data-action') === 'domain') await addDomain(getHostname());
        else await addBlockedUrl(window.location.href);
        await recordBlock();
        popup.style.display = 'none';
        btn.innerHTML = '✅';
        btn.style.background = '#28a745';
        setTimeout(() => { btn.innerHTML = '🛡'; btn.style.background = '#007bff'; }, 1500);
      };
      document.addEventListener('click', () => { popup.style.display = 'none'; }, true);
      document.body.appendChild(btn);
      document.body.appendChild(popup);
    }

    // ===== 自动 DOM 搜索结果检测 =====
    function autoDetectSearchResults(): SearchEngineConfig | null {
      const patternCount = new Map<string, { count: number; sample: Element }>();
      const all = document.querySelectorAll('*');
      console.log('[SRB] Auto-detect scanning', all.length, 'elements');
      for (const el of all) {
        if (el.children.length === 0) continue;
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'br', 'hr'].includes(tag)) continue;
        const cls = (el.className as string).toString().trim();
        if (!cls) continue;
        const key = tag + '.' + cls.split(/\s+/).sort().join('.');
        const entry = patternCount.get(key) || { count: 0, sample: el };
        entry.count++;
        patternCount.set(key, entry);
      }
      console.log('[SRB] Found', patternCount.size, 'unique patterns');

      // 输出所有出现 2 次以上的模式
      const candidates = Array.from(patternCount.entries())
        .filter(([, v]) => v.count >= 2)
        .sort((a, b) => b[1].count - a[1].count);
      console.log('[SRB] Patterns with count>=2:', candidates.length);
      candidates.slice(0, 20).forEach(([key, { count, sample: el }]) => {
        const links = el.querySelectorAll('a[href]').length;
        console.log(`  ${key} x${count} links:${links}`, (el as Element).children.length > 0 ? el : '');
      });

      // 给每个候选打分，选最优
      interface Score { key: string; score: number; count: number; el: Element; linkCount: number }
      const scored: Score[] = [];
      outer:
      for (const [key, { count, sample: el }] of patternCount) {
        if (count < 3) continue;
        const links = el.querySelectorAll('a[href]');
        if (links.length === 0) continue;

        const cls = (el.className as string).toLowerCase();
        const excludeWords = ['nav', 'menu', 'header', 'footer', 'overflow', 'toolbar', 'tab', 'breadcrumb', 'pagination', 'sidebar', 'toplist'];
        for (const word of excludeWords) {
          if (cls.includes(word)) continue outer;
        }

        // 向上检查是否在 nav/header/footer/sidebar 内部
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const ptag = parent.tagName.toLowerCase();
          const pcls = (parent.className as string).toLowerCase();
          if (ptag === 'nav' || ptag === 'header' || ptag === 'footer') continue outer;
          if (['nav', 'menu', 'header', 'footer', 'sidebar', 'aside', 'right', 'cr-offset'].some((w) => pcls.includes(w))) continue outer;
          parent = parent.parentElement;
        }

        // 评分：基础分 = count * 10 + links * 5
        let score = count * 10 + links.length * 5;
        // 加分项：class 包含 result/search/item 等关键词
        if (/\b(result|search|item|algo)\b/.test(cls)) score += 100;
        // 减分项：class 看起来像随机 hash（如 _1MWDu）
        if (/_[a-zA-Z0-9]{5,}/.test(cls)) score -= 20;

        scored.push({ key, score, count, el, linkCount: links.length });
      }

      if (scored.length === 0) { console.log('[SRB] No suitable pattern found'); return null; }

      scored.sort((a, b) => b.score - a.score);
      console.log('[SRB] Top 3 candidates:');
      scored.slice(0, 3).forEach((c) => console.log('  ', c.key, 'score:', c.score, 'count:', c.count, 'links:', c.linkCount, 'el:', c.el));

      const best = scored[0];
      console.log('[SRB] Best pattern:', best.key, 'score:', best.score, 'count:', best.count, 'links:', best.linkCount);

      const { el, count } = best;
      let container = el.parentElement;
      while (container && container !== document.body) {
        const similar = Array.from(container.children).filter(
          (c) => c.tagName === el.tagName && (c.className as string) === (el.className as string),
        );
        if (similar.length >= count) break;
        container = container.parentElement;
      }
      if (!container || container === document.body) container = el.parentElement;

      const tag = el.tagName.toLowerCase();
      const cls = (el.className as string).trim();
      const itemSelector = cls ? cls.split(/\s+/).map((c) => '.' + CSS.escape(c)).join('') : tag;

      const parts: string[] = [];
      let cur: Element | null = container;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const t = cur.tagName.toLowerCase();
        const id = cur.id ? '#' + CSS.escape(cur.id) : '';
        const c2 = Array.from(cur.classList).slice(0, 2).map((cl) => '.' + CSS.escape(cl)).join('');
        parts.unshift(t + id + c2);
        cur = cur.parentElement;
      }

      return {
        name: getHostname(),
        hostname: getHostname(),
        containerSelector: parts.join(' ') || 'body',
        itemSelector,
        linkSelector: 'a[href]',
      };
    }

    async function tryAutoDetect(): Promise<void> {
      const detected = autoDetectSearchResults();
      if (!detected) { console.log('[SRB] Auto-detect: no config generated'); return; }
      console.log('[SRB] Auto-detect generated config:', JSON.stringify(detected));
      const { customEngines } = await get();

      // 验证配置是否有效（容器能找到且有 2+ 匹配项）
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        console.log('[SRB] Generated config invalid, will retry in 3s');
        // 重试一次（可能页面还没渲染完）
        setTimeout(() => tryAutoDetect(), 3000);
        return;
      }

      // 替换已有配置（可能是之前误检测的）
      const existing = customEngines.findIndex((e) => e.hostname === detected.hostname);
      if (existing >= 0) {
        console.log('[SRB] Replacing existing config for', detected.hostname);
        customEngines[existing] = detected;
      } else {
        customEngines.push(detected);
      }
      await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
      currentEngine = detected;
      injectCollapseBar();
      scanResults(detected);
      const c = document.querySelector(detected.containerSelector) ?? document.body;
      new MutationObserver(debounce(() => { if (currentEngine) scanResults(currentEngine); }, 300)).observe(c, { childList: true, subtree: true });
    }

    // 初始化
    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      if (currentEngine) scanResults(currentEngine);
    });

    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      init();
      setTimeout(() => { if (!currentEngine) tryAutoDetect(); }, 2000);
    });
  },
});
