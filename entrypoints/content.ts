import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../utils/search-engines';
import { get, addDomain, addBlockedUrl, removeBlockedItem, recordBlock, subscribe } from '../utils/storage';
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
    let currentEngine: SearchEngineConfig | null = null;

    // ========== 选择器规则应用 ==========

    function execOnSelectors(fn: (el: HTMLElement) => void): void {
      if (!isEnabled && fn.toString().includes('none')) return;
      const curHost = getHostname();
      blockedSelectors.forEach((entry) => {
        const sep = entry.indexOf('||');
        if (sep === -1) return;
        if (entry.slice(0, sep) !== curHost) return;
        try {
          document.querySelectorAll(entry.slice(sep + 2)).forEach((el) => fn(el as HTMLElement));
        } catch { /* skip */ }
      });
    }

    function applyBlockedSelectors(): void {
      if (!isEnabled) return;
      execOnSelectors((el) => { el.style.display = 'none'; });
    }

    function restoreBlockedSelectors(): void {
      execOnSelectors((el) => { el.style.display = ''; });
    }

    function checkSavedSelectors(): void {
      setTimeout(() => applyBlockedSelectors(), 500);
    }

    // ========== 搜索结果处理 ==========

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

    function scanResults(engine: SearchEngineConfig): void {
      if (!isEnabled) return;
      const container = document.querySelector(engine.containerSelector);
      if (!container) { setTimeout(() => { tryAutoDetect(); }, 500); return; }
      container.querySelectorAll(engine.itemSelector).forEach((item) => processItem(item));
      updateCollapseBar();
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
      const { customEngines } = await get();
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        setTimeout(() => tryAutoDetect(), 3000);
        return;
      }
      const existing = customEngines.findIndex((e) => e.hostname === detected.hostname);
      if (existing >= 0) customEngines[existing] = detected;
      else customEngines.push(detected);
      await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
      currentEngine = detected;
      injectCollapseBar(detected.containerSelector);
      scanResults(detected);
      const c = document.querySelector(detected.containerSelector) ?? document.body;
      new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); applyBlockedSelectors(); } }, 300))
        .observe(c, { childList: true, subtree: true });
    }

    // ========== 入口 ==========

    let onStartPicker: (() => void) | null = null;

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();

      injectStyles();
      injectFloatingBtn();

      // 持久监听 DOM 变化，确保无限加载的新内容也能应用选择器屏蔽
      const selectorObs = new MutationObserver(
        debounce(() => { if (isEnabled) applyBlockedSelectors(); }, 300)
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
          new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); applyBlockedSelectors(); } }, 300))
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
    }

    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;

      if (!isEnabled) {
        restoreBlockedSelectors();
        document.querySelectorAll('.srb-mask, .srb-blocked-badge').forEach((el) => el.remove());
        document.querySelectorAll('[data-srb-processed]').forEach((el) => el.removeAttribute('data-srb-processed'));
        return;
      }

      applyBlockedSelectors();
      if (currentEngine) {
        const container = document.querySelector(currentEngine.containerSelector);
        if (container) container.querySelectorAll('[data-srb-processed]').forEach((el) => el.removeAttribute('data-srb-processed'));
        scanResults(currentEngine);
      }
    });

    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      init();
      checkSavedSelectors();
    });
  },
});
