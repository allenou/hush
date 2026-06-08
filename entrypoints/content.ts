import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../utils/search-engines';
import { get, addDomain, addBlockedUrl, removeBlockedItem, recordBlock, subscribe } from '../utils/storage';
import { getHostname, extractResultUrl } from '../utils/url';
import { autoDetectSearchResults } from '../utils/detector';
import { injectFloatingBtn, injectCollapseBar, updateCollapseBar } from '../utils/ui';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let isEnabled = true;
    let currentEngine: SearchEngineConfig | null = null;

    function processItem(item: Element): void {
      if (item.hasAttribute('data-srb-processed')) return;
      item.setAttribute('data-srb-processed', 'true');
      if (!currentEngine) return;
      const href = extractResultUrl(item, currentEngine.linkSelector);
      if (!href) return;
      const domainMatch = blockedDomains.some((d) => href.includes(d));
      const urlMatch = blockedUrls.includes(href);
      if (domainMatch || urlMatch) injectBadge(item, domainMatch, urlMatch, href);
      else injectBlockButton(item, href);
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
        popup.style.display = 'none'; btn.style.display = 'none'; btn.remove(); popup.remove();
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
      if (!container) { setTimeout(() => { tryAutoDetect(); }, 500); return; }
      const items = container.querySelectorAll(engine.itemSelector);
      items.forEach((item) => processItem(item));
      updateCollapseBar();
    }

    const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: unknown[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
    };

    async function tryAutoDetect(): Promise<void> {
      const detected = autoDetectSearchResults(getHostname);
      if (!detected) return;
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
      new MutationObserver(debounce(() => { if (currentEngine) scanResults(currentEngine); }, 300)).observe(c, { childList: true, subtree: true });
    }

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();
      injectFloatingBtn();
      currentEngine = BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ?? customEngines.find((e) => e.hostname === hostname) ?? null;
      if (!currentEngine) { setTimeout(() => tryAutoDetect(), 2000); return; }
      const testContainer = document.querySelector(currentEngine.containerSelector);
      const testItems = testContainer ? testContainer.querySelectorAll(currentEngine.itemSelector) : [];
      if (!testContainer || testItems.length < 2) {
        const idx = customEngines.findIndex((e) => e.hostname === hostname);
        if (idx >= 0) { customEngines.splice(idx, 1); await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } }); }
        currentEngine = null;
        setTimeout(() => tryAutoDetect(), 500);
        return;
      }
      injectCollapseBar(currentEngine.containerSelector);
      scanResults(currentEngine);
      const c = document.querySelector(currentEngine.containerSelector) ?? document.body;
      new MutationObserver(debounce(() => { if (currentEngine) scanResults(currentEngine); }, 300)).observe(c, { childList: true, subtree: true });
    }

    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      if (currentEngine) {
        const container = document.querySelector(currentEngine.containerSelector);
        if (container) container.querySelectorAll('[data-srb-processed]').forEach((el) => el.removeAttribute('data-srb-processed'));
        scanResults(currentEngine);
      }
    });

    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      init();
    });
  },
});
