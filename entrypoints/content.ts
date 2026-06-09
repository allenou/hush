import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, type SearchEngineConfig } from '../utils/search-engines';
import { get, addDomain, addBlockedUrl, addBlockedSelector, removeBlockedItem, removeBlockedSelector, recordBlock, subscribe } from '../utils/storage';
import { getHostname, extractResultUrl } from '../utils/url';
import { autoDetectSearchResults } from '../utils/detector';
import { injectFloatingBtn, injectCollapseBar, updateCollapseBar } from '../utils/ui';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let blockedSelectors: string[] = [];
    let isEnabled = true;
    let currentEngine: SearchEngineConfig | null = null;

    function tryParseHostname(url: string): string | null {
      try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
    }

    // ========== 选取模式 (picker) ==========

    let pickerActive = false;
    let pickerHighlight: HTMLDivElement | null = null;
    let pickerTooltip: HTMLDivElement | null = null;

    /** 为元素生成稳定的 CSS 选择器 */
    function generateSelector(el: Element): string {
      // 1) 如果有稳定的 id，直接用
      if (el.id && !/^[a-z]*[0-9a-f]{8,}/i.test(el.id)) {
        return '#' + CSS.escape(el.id);
      }
      // 2) 用稳定 class 名（过滤掉 hash 类名），同类型可复用
      const stableClasses = Array.from(el.classList)
        .filter((c) => !/^[a-z]*[0-9a-f]{5,}/i.test(c) && !/^_/.test(c) && !/^css-/.test(c) && c.length > 2)
        .slice(0, 2);
      if (stableClasses.length > 0) {
        return el.tagName.toLowerCase() + '.' + stableClasses.map((c) => CSS.escape(c)).join('.');
      }
      // 3) 兜底：nth-child 路径
      const parts: string[] = [];
      let cur: Element | null = el;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const parent = cur.parentElement;
        if (!parent) break;
        const siblings = Array.from(parent.children);
        if (siblings.length === 1) {
          parts.unshift(cur.tagName.toLowerCase());
        } else {
          const idx = siblings.indexOf(cur) + 1;
          parts.unshift(cur.tagName.toLowerCase() + ':nth-child(' + idx + ')');
        }
        cur = parent;
        if ((cur as HTMLElement).id && !/^[a-z]*[0-9a-f]{8,}/i.test((cur as HTMLElement).id)) {
          parts.unshift('#' + CSS.escape((cur as HTMLElement).id));
          break;
        }
        if (parts.length > 4) break;
      }
      return parts.join(' > ');
    }

    /** 从最里层向上找合适的"块"元素，太大太小都不行 */
    function findBlockTarget(el: Element): Element | null {
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      const tooLarge = vpW * vpH * 0.45; // 超过 45% 视口面积 → 太大

      let best: Element | null = null;
      let cur: Element | null = el;
      let depth = 0;

      while (cur && cur !== document.body && cur !== document.documentElement && depth < 8) {
        const rect = cur.getBoundingClientRect();
        const area = rect.width * rect.height;
        const tag = cur.tagName.toLowerCase();
        const children = cur.children.length;
        const hasLink = cur.querySelector('a[href]');
        const textLen = (cur.textContent ?? '').trim().length;

        // 太大 → 停止继续往上（再往上只会更大）
        if (area > tooLarge) break;

        // 太小 → 还没到块级，继续往上
        if (area < 8000 || children < 2 || !hasLink) {
          cur = cur.parentElement;
          depth++;
          continue;
        }

        // 是结构标签才算"块"
        if (['div', 'li', 'article', 'section', 'tr', 'ul', 'ol'].includes(tag)) {
          best = cur;
        }

        cur = cur.parentElement;
        depth++;
      }

      return best;
    }

    /** 隐藏所有匹配已存选择器的元素（仅当前域名生效，避免跨站误伤） */
    function applyBlockedSelectors(): void {
      if (!isEnabled) return;
      const curHost = getHostname();
      blockedSelectors.forEach((entry) => {
        const sep = entry.indexOf('||');
        if (sep === -1) return; // 旧格式无域名限定，跳过
        const host = entry.slice(0, sep);
        const sel = entry.slice(sep + 2);
        if (host !== curHost) return;
        try {
          document.querySelectorAll(sel).forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        } catch { /* selector invalid, skip */ }
      });
    }

    /** 检测当前页是否已有匹配已存选择器的元素并执行隐藏 */
    function checkSavedSelectors(): void {
      // on initial load mutations may not have registered yet
      setTimeout(() => applyBlockedSelectors(), 500);
    }

    function deactivatePicker(): void {
      pickerActive = false;
      document.body.style.cursor = '';
      pickerHighlight?.remove();
      pickerHighlight = null;
      pickerTooltip?.remove();
      pickerTooltip = null;
    }

    function activatePicker(): void {
      if (pickerActive) deactivatePicker();
      pickerActive = true;
      document.body.style.cursor = 'crosshair';

      // 顶部提示条
      pickerTooltip = document.createElement('div');
      pickerTooltip.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;padding:10px 16px;background:#007bff;color:#fff;font-size:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      pickerTooltip.textContent = '点击页面元素选择要屏蔽的内容 · Esc 退出';
      document.body.appendChild(pickerTooltip);

      // 浮动高亮层
      pickerHighlight = document.createElement('div');
      pickerHighlight.style.cssText = 'position:fixed;z-index:999998;pointer-events:none;border:2px solid #007bff;background:rgba(0,123,255,0.08);transition:all 0.08s;display:none;';
      document.body.appendChild(pickerHighlight);

      const onMove = (e: MouseEvent) => {
        if (!pickerActive || !pickerHighlight) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === document.body || el === document.documentElement) {
          pickerHighlight.style.display = 'none';
          return;
        }
        const target = findBlockTarget(el);
        if (!target || target.closest('#srb-float-btn, #srb-float-popup, .srb-picker-confirm, .srb-undo-toast')) {
          pickerHighlight.style.display = 'none';
          return;
        }
        const rect = target.getBoundingClientRect();
        pickerHighlight.style.display = 'block';
        pickerHighlight.style.left = rect.left + 'px';
        pickerHighlight.style.top = rect.top + 'px';
        pickerHighlight.style.width = rect.width + 'px';
        pickerHighlight.style.height = rect.height + 'px';
      };

      const onClick = (e: MouseEvent) => {
        if (!pickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (!el || el === document.body || el === document.documentElement) return;
        const target = findBlockTarget(el);
        if (!target || target.closest('#srb-float-btn, #srb-float-popup, .srb-picker-confirm, .srb-undo-toast')) return;

        const selector = generateSelector(target);

        // 确认弹窗
        deactivatePicker();
        showPickerConfirm(target, selector);
      };

      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') deactivatePicker();
      };

      // 存起来用于 cleanup
      (activatePicker as any)._onMove = onMove;
      (activatePicker as any)._onClick = onClick;
      (activatePicker as any)._onKey = onKey;

      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey);
    }

    function showPickerConfirm(el: Element, selector: string): void {
      const overlay = document.createElement('div');
      overlay.className = 'srb-picker-confirm';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';

      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,0.25);padding:20px;max-width:480px;width:90%;font-size:13px;line-height:1.5;';

      const preview = (el.textContent ?? '').trim().slice(0, 120);

      box.innerHTML =
        '<div style="margin-bottom:12px;font-weight:600;font-size:15px;">屏蔽此元素</div>' +
        '<div style="margin-bottom:8px;color:#666;">域名：<code style="background:#f5f5f5;padding:1px 6px;border-radius:3px;">' + getHostname() + '</code></div>' +
        '<div style="margin-bottom:8px;color:#666;">选择器：<code style="background:#f5f5f5;padding:1px 6px;border-radius:3px;word-break:break-all;">' + selector.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></div>' +
        '<div style="margin-bottom:16px;color:#666;">内容预览：<span style="color:#333;">' + preview.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="srb-picker-cancel" style="padding:8px 20px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">取消</button>' +
        '<button class="srb-picker-ok" style="padding:8px 20px;border:none;border-radius:6px;background:#c00;color:#fff;cursor:pointer;font-size:13px;">屏蔽</button>' +
        '</div>';

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      box.querySelector('.srb-picker-ok')?.addEventListener('click', async () => {
        try {
          const full = getHostname() + '||' + selector;
          (el as HTMLElement).style.display = 'none';
          await addBlockedSelector(full);
          await recordBlock();
          showUndoToast(full, el);
          overlay.remove();
        } catch (err) {
          console.error('[SRB] Failed to block by selector:', err);
          overlay.remove();
        }
      });

      box.querySelector('.srb-picker-cancel')?.addEventListener('click', () => overlay.remove());
    }

    function showUndoToast(fullEntry: string, el: Element): void {
      const toast = document.createElement('div');
      toast.className = 'srb-undo-toast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:999999;background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,0.3);';
      toast.innerHTML = '已屏蔽该元素 <button class="srb-undo-btn" style="padding:4px 12px;border:1px solid #fff;border-radius:4px;background:transparent;color:#fff;cursor:pointer;font-size:12px;">撤销</button>';
      document.body.appendChild(toast);

      const timer = setTimeout(() => toast.remove(), 5000);

      toast.querySelector('.srb-undo-btn')?.addEventListener('click', async () => {
        clearTimeout(timer);
        (el as HTMLElement).style.display = '';
        const { blockedSelectors: bs } = await get();
        const idx = bs.indexOf(fullEntry);
        if (idx >= 0) await removeBlockedSelector(idx);
        toast.remove();
      });
    }

    // ========== 选取模式结束 ==========

    function processItem(item: Element): void {
      if (item.hasAttribute('data-srb-processed')) return;
      item.setAttribute('data-srb-processed', 'true');
      if (!currentEngine) return;
      const href = extractResultUrl(item, currentEngine.linkSelector);
      if (!href) { console.log('[SRB] processItem: no href for', item); return; }
      const hrefHostname = tryParseHostname(href);
      const domainMatch = hrefHostname && blockedDomains.some((d) => hrefHostname === d || hrefHostname.endsWith('.' + d));
      if (domainMatch) console.log('[SRB] BADGE match:', href, 'domain in', blockedDomains);
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
      popup.style.cssText = 'position:absolute;top:28px;right:0;z-index:10000;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:none;flex-direction:column;min-width:150px;';
      popup.innerHTML = '<button class="srb-opt-domain" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;">🌐 屏蔽此域名</button><button class="srb-opt-url" style="padding:8px 12px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px;border-top:1px solid #eee;">🔗 屏蔽此链接</button>';
      item.addEventListener('mouseenter', () => { btn.style.display = 'flex'; });
      item.addEventListener('mouseleave', (e) => {
        if (!popup.contains(e.relatedTarget as Node) && e.relatedTarget !== btn) { btn.style.display = 'none'; popup.style.display = 'none'; }
      });
      btn.addEventListener('click', (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; });
      popup.addEventListener('click', async (e) => {
        const t = e.target as HTMLElement;
        const domain = new URL(href).hostname.replace(/^www\./, '');
        if (t.classList.contains('srb-opt-domain')) await addDomain(domain);
        else await addBlockedUrl(href);
        await recordBlock();
        popup.style.display = 'none'; btn.style.display = 'none'; btn.remove(); popup.remove();
        injectBadge(item, t.classList.contains('srb-opt-domain'), t.classList.contains('srb-opt-url'), href);
        updateCollapseBar();
      });
      item.appendChild(btn);
      item.appendChild(popup);
    }

    function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
      if (item.querySelector('.srb-blocked-badge')) return;

      // 蒙版层
      const mask = document.createElement('div');
      mask.className = 'srb-mask';
      mask.style.cssText = 'position:absolute;inset:0;z-index:9998;background:rgba(255,255,255,0.55);pointer-events:none;';
      (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

      const badge = document.createElement('div');
      badge.className = 'srb-blocked-badge';
      badge.textContent = '已屏蔽';
      badge.title = '点击取消屏蔽';
      badge.style.cssText = 'position:absolute;top:4px;right:4px;z-index:9999;padding:2px 8px;border-radius:4px;background:#e8e8e8;color:#666;font-size:11px;cursor:pointer;user-select:none;';
      badge.addEventListener('click', async () => {
        mask.remove();
        badge.remove();
        const hrefHost = tryParseHostname(href);
        const di = hrefHost ? blockedDomains.findIndex((d) => hrefHost === d || hrefHost.endsWith('.' + d)) : -1;
        const ui = blockedUrls.indexOf(href);

        if (di >= 0 && !urlMatch) await removeBlockedItem('domain', di);
        else if (ui >= 0 && !di) await removeBlockedItem('url', ui);
        else if (di >= 0 && urlMatch) {
          if (confirm('取消屏蔽此域名？\n确定=是，取消=仅取消此链接')) await removeBlockedItem('domain', di);
          else { if (ui >= 0) await removeBlockedItem('url', ui); }
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
      new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); applyBlockedSelectors(); } }, 300)).observe(c, { childList: true, subtree: true });
    }

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();
      injectFloatingBtn();
      document.addEventListener('srb-start-picker', () => activatePicker());

      // 先查已保存的配置（可能来自之前的自动检测）
      currentEngine = customEngines.find((e) => e.hostname === hostname) ?? null;
      if (currentEngine) {
        const testContainer = document.querySelector(currentEngine.containerSelector);
        const testItems = testContainer ? testContainer.querySelectorAll(currentEngine.itemSelector) : [];
        if (testContainer && testItems.length >= 2) {
          injectCollapseBar(currentEngine.containerSelector);
          scanResults(currentEngine);
          const c = document.querySelector(currentEngine.containerSelector) ?? document.body;
          new MutationObserver(debounce(() => { if (currentEngine) { scanResults(currentEngine); applyBlockedSelectors(); } }, 300)).observe(c, { childList: true, subtree: true });
          return;
        }
        // 配置失效，清除后重新检测
        const idx = customEngines.findIndex((e) => e.hostname === hostname);
        if (idx >= 0) {
          customEngines.splice(idx, 1);
          await chrome.storage.local.set({ blocker: { ...(await get()), customEngines } });
        }
        currentEngine = null;
      }

      // 判断是否已知搜索引擎（根据 hostname 匹配内置列表）
      const isKnown = BUILT_IN_ENGINES.some((e) => e.hostname === hostname);
      if (isKnown) {
        // 已知引擎但无有效配置 → 立即检测
        await tryAutoDetect();
      } else {
        // 未知引擎 → 2 秒后尝试自动检测
        setTimeout(() => tryAutoDetect(), 2000);
      }
    }

    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
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
