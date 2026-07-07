import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../utils/search-engines';
import { get, addDomain, addBlockedUrl, removeBlockedItem, recordBlock, setBlockAds, subscribe } from '../utils/storage';
import { injectStyles } from '../utils/styles';
import { activatePicker, deactivatePicker, isPickerActive } from '../utils/picker';
import { getHostname, extractResultUrl } from '../utils/url';
import { autoDetectSearchResults } from '../utils/detector';
import { injectFloatingBtn, injectCollapseBar, updateCollapseBar } from '../utils/ui';

/** 从 URL 提取 hostname，失败返回 null */
function tryParseHostname(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

/** 在域名列表中查找匹配（支持子域名），返回 index 或 -1 */
function matchBlockedDomain(href: string, domains: string[]): number {
  const hostname = tryParseHostname(href);
  if (!hostname) return -1;
  return domains.findIndex((d) => hostname === d || hostname.endsWith('.' + d));
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let blockedSelectors: string[] = [];
    let isEnabled = true;
    let blockAds = false;
    let currentEngine: SearchEngineConfig | null = null;

    // ========== 选择器规则应用 ==========

function applyBlockedSelectors(): void {
      if (!isEnabled) return;
      const curHost = getHostname();
      blockedSelectors.forEach((entry) => {
        const sep = entry.indexOf('||');
        if (sep === -1) return;
        if (entry.slice(0, sep) !== curHost) return;
        const selector = entry.slice(sep + 2);
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (el.querySelector('.srb-mask, .srb-blocked-badge')) return;
            (el as HTMLElement).style.position = (el as HTMLElement).style.position || 'relative';
            const mask = document.createElement('div');
            mask.className = 'srb-mask';
            el.appendChild(mask);
            const badge = document.createElement('div');
            badge.className = 'srb-blocked-badge';
            badge.textContent = '已屏蔽';
            badge.title = '点击取消屏蔽';
            badge.setAttribute('data-entry', entry);
            badge.addEventListener('click', async () => {
              mask.remove();
              badge.remove();
              const fullEntry = badge.getAttribute('data-entry');
              if (fullEntry) {
                const idx = blockedSelectors.indexOf(fullEntry);
                if (idx >= 0) await removeBlockedItem('selector', idx);
              }
            });
            el.appendChild(badge);
          });
        } catch { /* skip */ }
      });
    }

    function restoreBlockedSelectors(): void {
      const curHost = getHostname();
      blockedSelectors.forEach((entry) => {
        const sep = entry.indexOf('||');
        if (sep === -1) return;
        if (entry.slice(0, sep) !== curHost) return;
        try {
          document.querySelectorAll(entry.slice(sep + 2)).forEach((el) => {
            el.querySelectorAll('.srb-mask, .srb-blocked-badge').forEach((b) => b.remove());
          });
        } catch { /* skip */ }
      });
    }

    function checkSavedSelectors(): void {
      setTimeout(() => applyBlockedSelectors(), 500);
    }

    // ========== 搜索结果处理 ==========

    /** 判断搜索结果项是否包含广告标记 */
    function isAdItem(item: Element): boolean {
      if (item.querySelector('[class*="ad-label" i], [aria-label*="ad" i], [aria-label*="sponsor" i]')) return true;
      const cls = (item.className as string).toLowerCase();
      if (/\b(?:ad|sponsor)\b/.test(cls)) return true;
      // 只在明确的小元素范围内搜索广告文本，避免命中结果正文
      const badgeTexts = ['广告', '推广'];
      const miniEls = item.querySelectorAll('span, small, label, em, b, i');
      for (const el of miniEls) {
        if (el.children.length > 2) continue;
        const t = (el.textContent ?? '').trim();
        if (t.length > 0 && t.length < 20 && badgeTexts.includes(t)) return true;
      }
      return false;
    }

    function processItem(item: Element): void {
      if (item.hasAttribute('data-srb-processed')) return;
      item.setAttribute('data-srb-processed', 'true');
      if (!currentEngine) return;
      const href = extractResultUrl(item, currentEngine.linkSelector);
      if (!href) { console.log('[SRB] processItem: no href for', item); return; }
      const di = matchBlockedDomain(href, blockedDomains);
      if (di >= 0) console.log('[SRB] BADGE match:', href, 'domain in', blockedDomains);
      const urlMatch = blockedUrls.includes(href);
      if (di >= 0 || urlMatch) injectBadge(item, di >= 0, urlMatch, href);
      else if (blockAds && isAdItem(item)) injectAdBadge(item, href);
      else injectBlockButton(item, href);
    }

    function injectBlockButton(item: Element, href: string): void {
      if (item.querySelector('.srb-block-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'srb-block-btn';
      btn.textContent = '⊕';
      btn.title = '屏蔽此结果';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      const popup = document.createElement('div');
      popup.className = 'srb-popup';
      popup.innerHTML =
        '<button class="srb-opt" data-action="domain">🌐 屏蔽此域名</button>' +
        '<button class="srb-opt" data-action="url">🔗 屏蔽此链接</button>';

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
        const t = e.target as HTMLElement;
        const domain = new URL(href).hostname.replace(/^www\./, '');
        if (t.getAttribute('data-action') === 'domain') await addDomain(domain);
        else await addBlockedUrl(href);
        await recordBlock();
        popup.style.display = 'none';
        btn.style.display = 'none';
        btn.remove();
        popup.remove();
        injectBadge(item, t.getAttribute('data-action') === 'domain', t.getAttribute('data-action') === 'url', href);
        updateCollapseBar();
      });
      item.appendChild(btn);
      item.appendChild(popup);
    }

    function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
      if (item.querySelector('.srb-blocked-badge')) return;
      const mask = document.createElement('div');
      mask.className = 'srb-mask';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      const badge = document.createElement('div');
      badge.className = 'srb-blocked-badge';
      badge.textContent = '已屏蔽';
      badge.title = '点击取消屏蔽';
      badge.addEventListener('click', async () => {
        mask.remove();
        badge.remove();
        const di = matchBlockedDomain(href, blockedDomains);
        const ui = blockedUrls.indexOf(href);

        if (di >= 0 && !urlMatch) await removeBlockedItem('domain', di);
        else if (ui >= 0 && di === -1) await removeBlockedItem('url', ui);
        else if (di >= 0 && urlMatch) {
          if (confirm('取消屏蔽此域名？\n确定=是，取消=仅取消此链接')) {
            await removeBlockedItem('domain', di);
          } else if (ui >= 0) {
            await removeBlockedItem('url', ui);
          }
        }
        updateCollapseBar();
      });
      item.appendChild(mask);
      item.appendChild(badge);
    }

    function injectAdBadge(item: Element, href: string): void {
      if (item.querySelector('.srb-ad-badge')) return;
      const mask = document.createElement('div');
      mask.className = 'srb-ad-mask';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      const badge = document.createElement('div');
      badge.className = 'srb-ad-badge';
      badge.textContent = '📢 广告';
      badge.title = '点击取消屏蔽（临时）';
      badge.addEventListener('click', () => {
        mask.remove();
        badge.remove();
        // 临时取消后显示 ⊕ 按钮，让用户可永久屏蔽
        if (href) injectBlockButton(item, href);
      });
      item.appendChild(mask);
      item.appendChild(badge);
    }

    function scanResults(engine: SearchEngineConfig): void {
      if (!isEnabled) return;
      const container = document.querySelector(engine.containerSelector);
      if (!container) { setTimeout(() => { tryAutoDetect(); }, 500); return; }
      container.querySelectorAll(engine.itemSelector).forEach((item) => processItem(item));
      scanForAds();
      updateCollapseBar();
    }

    /** 广告扫描 — 从广告标记 badge（短文本）向上找父级结果项，屏蔽结果项而非 badge */
    function scanForAds(): void {
      if (!blockAds || !isEnabled) return;

      // 找页面上所有短文本广告标记（span / small / label / a / 带 ad 类的元素）
      const badges = document.querySelectorAll<HTMLElement>(
        'span, small, label, em, i, b, strong, a, ' +
        '[class*="ad-label"], [class*="ad-badge"], [class*="badge"]',
      );

      badges.forEach((badge) => {
        if (badge.hasAttribute('data-srb-ad-badge')) return;
        const t = (badge.textContent ?? '').trim();
        // 只有短文本（<20 字符）才有可能是个 badge 标记，不是正文
        if (t.length === 0 || t.length > 20) return;
        if (badge.children.length > 3) return; // 子元素太多不可能是 badge

        const lower = t.toLowerCase();
        const isAdLabel = t === '广告' || t === '推广' || lower === 'ad' || lower === 'sponsored';

        if (!isAdLabel) return;
        badge.setAttribute('data-srb-ad-badge', 'true');

        // 从 badge 向上找到贴紧的父级结果项
        let best: HTMLElement | null = null;
        let cur: HTMLElement | null = badge.parentElement;
        let depth = 0;
        while (cur && cur !== document.body && depth < 6) {
          const tag = cur.tagName.toLowerCase();
          if (cur.querySelector('a[href]') && cur.children.length >= 2) {
            if (['li', 'section', 'article', 'tr'].includes(tag)) {
              best = cur;
              break;
            }
            // div 只取遇到的第一个，不继续覆盖为更大的容器
            if (tag === 'div' && !best) best = cur;
          }
          cur = cur.parentElement;
          depth++;
        }
        // 尺寸防护：如果标中的容器超过视口 60%，说明找错了
        if (best) {
          const r = best.getBoundingClientRect();
          const vpArea = window.innerWidth * window.innerHeight;
          if (r.width * r.height > vpArea * 0.6) best = null;
        }
        if (best && !best.hasAttribute('data-srb-ad-scanned')) {
          best.setAttribute('data-srb-ad-scanned', 'true');
          injectAdBadge(best, '');
        }
      });
    }

    // ========== 自动检测 ==========

    const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: unknown[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
    };

    let autoDetectRetries = 0;
    const MAX_AUTO_DETECT_RETRIES = 6;

    async function tryAutoDetect(): Promise<void> {
      if (autoDetectRetries >= MAX_AUTO_DETECT_RETRIES) {
        console.log('[SRB] Auto-detect max retries reached');
        return;
      }
      autoDetectRetries++;

      const detected = autoDetectSearchResults(getHostname);
      if (!detected) {
        setTimeout(() => tryAutoDetect(), 3000);
        return;
      }
      const hostname = getHostname();
      const isBuiltIn = BUILT_IN_ENGINES.some((e) => e.hostname === hostname);
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        setTimeout(() => tryAutoDetect(), 3000);
        return;
      }
      // 内置引擎不持久化到 customEngines，只在内存中使用
      if (!isBuiltIn) {
        const { customEngines } = await get();
        const existing = customEngines.findIndex((e) => e.hostname === detected.hostname);
        if (existing >= 0) customEngines[existing] = detected;
        else customEngines.push(detected);
        await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
      }
      currentEngine = detected;
      injectCollapseBar(detected.containerSelector);
      scanResults(detected);
      const c = document.querySelector(detected.containerSelector) ?? document.body;
      new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); scanForAds();
            if (currentEngine) scanResults(currentEngine);
            applyBlockedSelectors(); } }, 300))
        .observe(c, { childList: true, subtree: true });
    }

    // ========== 入口 ==========

    let onStartPicker: (() => void) | null = null;

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();

      injectStyles();
      injectFloatingBtn();

      // 持久监听 DOM 变化，确保无限加载的新内容也能应用选择器屏蔽、广告检测和域名屏蔽
      const selectorObs = new MutationObserver(
        debounce(() => {
          if (isEnabled) {
            scanForAds();
            if (currentEngine) scanResults(currentEngine);
            applyBlockedSelectors();
          }
          // 翻页后内容异步加载，延迟再扫一次兜底
          if (isEnabled && blockAds) setTimeout(scanForAds, 1500);
          if (isEnabled && currentEngine) setTimeout(() => scanResults(currentEngine!), 1500);
          // SPA 翻页可能清空 DOM，延迟重新注入样式和浮动按钮
          setTimeout(() => { injectStyles(); injectFloatingBtn(); }, 1500);
        }, 300)
      );
      selectorObs.observe(document.body, { childList: true, subtree: true });

      if (onStartPicker) document.removeEventListener('srb-start-picker', onStartPicker);
      onStartPicker = () => activatePicker(getHostname);
      document.addEventListener('srb-start-picker', onStartPicker);

      currentEngine = customEngines.find((e) => e.hostname === hostname) ?? null;
      if (currentEngine) {
        const testContainer = document.querySelector(currentEngine.containerSelector);
        const testItems = testContainer ? testContainer.querySelectorAll(currentEngine.itemSelector) : [];
        if (testContainer && testItems.length >= 2) {
          injectCollapseBar(currentEngine.containerSelector);
          scanResults(currentEngine);
          const c = document.querySelector(currentEngine.containerSelector) ?? document.body;
          new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); scanForAds();
            if (currentEngine) scanResults(currentEngine);
            applyBlockedSelectors(); } }, 300))
            .observe(c, { childList: true, subtree: true });
          return;
        }
        const idx = customEngines.findIndex((e) => e.hostname === hostname);
        if (idx >= 0) {
          customEngines.splice(idx, 1);
          await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
        }
        currentEngine = null;
      }

      if (BUILT_IN_ENGINES.some((e) => e.hostname === hostname)) {
        await tryAutoDetect();
      } else {
        setTimeout(() => tryAutoDetect(), 2000);
      }
      // 无论如何都执行一次广告扫描（引擎检测可能失败）
      scanForAds();
      // 延迟再扫一次，兜底异步加载的广告标签
      setTimeout(scanForAds, 1500);
    }

    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      blockAds = storage.blockAds ?? false;

      if (!isEnabled) {
        restoreBlockedSelectors();
        document.querySelectorAll('.srb-mask, .srb-blocked-badge, .srb-ad-mask, .srb-ad-badge').forEach((el) => el.remove());
        document.querySelectorAll('[data-srb-processed], [data-srb-ad-scanned]').forEach((el) => {
          el.removeAttribute('data-srb-processed');
          el.removeAttribute('data-srb-ad-scanned');
      document.querySelectorAll('.srb-mask, .srb-blocked-badge, .srb-ad-mask, .srb-ad-badge, .srb-block-btn, .srb-popup').forEach((el) => el.remove());
        });
        return;
      }

      scanForAds();
            if (currentEngine) scanResults(currentEngine);
            applyBlockedSelectors();
      // 清除旧标记和已有徽章，确保重新扫描完全生效
      document.querySelectorAll('[data-srb-processed], [data-srb-ad-scanned]').forEach((el) => {
        el.removeAttribute('data-srb-processed');
        el.removeAttribute('data-srb-ad-scanned');
      });
      document.querySelectorAll('.srb-mask, .srb-blocked-badge, .srb-ad-mask, .srb-ad-badge, .srb-block-btn, .srb-popup').forEach((el) => el.remove());
      if (currentEngine) {
        scanResults(currentEngine);
      } else {
        scanForAds();
      }
    });

    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      blockAds = storage.blockAds ?? false;
      init();
      checkSavedSelectors();
    });
  },
});
