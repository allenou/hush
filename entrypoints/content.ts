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

    /** 注入折叠提示条 */
    function injectCollapseBar(): void {
      const existing = document.getElementById('srb-collapse-bar');
      if (existing) return;
      const bar = document.createElement('div');
      bar.id = 'srb-collapse-bar';
      bar.style.cssText = [
        'padding: 6px 12px; margin: 4px 0; font-size: 13px;',
        'background: #fff3cd; color: #856404; border-radius: 4px;',
        'display: none;',
      ].join(' ');
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
        return;
      }

      injectBlockButton(item, href);
    }

    /** 注入 ⊕ 屏蔽按钮 */
    function injectBlockButton(item: Element, href: string): void {
      if (item.querySelector('.srb-block-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'srb-block-btn';
      btn.innerHTML = '⊕';
      btn.title = '屏蔽此结果';
      btn.style.cssText = [
        'position: absolute; top: 4px; right: 4px; z-index: 9999;',
        'width: 22px; height: 22px; border: 1px solid #ccc;',
        'border-radius: 50%; background: #fff; cursor: pointer;',
        'font-size: 14px; line-height: 1; display: none;',
        'align-items: center; justify-content: center; padding: 0;',
      ].join(' ');

      (item as HTMLElement).style.position =
        (item as HTMLElement).style.position || 'relative';

      const popup = document.createElement('div');
      popup.className = 'srb-popup';
      popup.style.cssText = [
        'position: absolute; top: 28px; right: 0; z-index: 10000;',
        'background: #fff; border: 1px solid #ddd; border-radius: 6px;',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: none;',
        'flex-direction: column; min-width: 140px;',
      ].join(' ');
      popup.innerHTML = [
        '<button class="srb-opt-domain" style="padding:8px 12px;border:none;',
        'background:none;cursor:pointer;text-align:left;font-size:13px;">屏蔽此域名</button>',
        '<button class="srb-opt-url" style="padding:8px 12px;border:none;',
        'background:none;cursor:pointer;text-align:left;font-size:13px;',
        'border-top:1px solid #eee;">屏蔽此链接</button>',
      ].join(' ');

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
    function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
      if (item.querySelector('.srb-blocked-badge')) return;

      const badge = document.createElement('div');
      badge.className = 'srb-blocked-badge';
      badge.textContent = '已屏蔽';
      badge.title = '点击取消屏蔽';
      badge.style.cssText = [
        'position: absolute; top: 4px; right: 4px; z-index: 9999;',
        'padding: 2px 8px; border-radius: 4px;',
        'background: #e8e8e8; color: #666; font-size: 11px;',
        'cursor: pointer; user-select: none;',
      ].join(' ');

      (item as HTMLElement).style.position =
        (item as HTMLElement).style.position || 'relative';

      badge.addEventListener('click', async () => {
        badge.remove();
        const domain = new URL(href).hostname.replace(/^www\./, '');
        const domainIdx = blockedDomains.indexOf(domain);
        if (domainIdx >= 0 && !urlMatch) {
          await removeBlockedItem('domain', domainIdx);
        } else if (urlMatch && domainIdx === -1) {
          const urlIdx = blockedUrls.indexOf(href);
          if (urlIdx >= 0) await removeBlockedItem('url', urlIdx);
        } else if (domainIdx >= 0 && urlMatch) {
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

    /** 主扫描循环 */
    function scanResults(engine: SearchEngineConfig): void {
      if (!isEnabled) return;
      const container = document.querySelector(engine.containerSelector);
      if (!container) return;
      const items = container.querySelectorAll(engine.itemSelector);
      items.forEach((item) => processItem(item));
      updateCollapseBar();
    }

    const debounce = <T extends (...args: unknown[]) => void>(fn: T, ms: number): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: unknown[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      }) as T;
    };

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();

      injectFloatingBtn();

      currentEngine =
        BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ??
        customEngines.find((e) => e.hostname === hostname) ??
        null;
      if (!currentEngine) return;

      injectCollapseBar();
      scanResults(currentEngine);

      const container = document.querySelector(currentEngine.containerSelector) ?? document.body;
      const observer = new MutationObserver(
        debounce(() => { if (currentEngine) scanResults(currentEngine); }, 300),
      );
      observer.observe(container, { childList: true, subtree: true });
    }

    /** 浮动屏蔽按钮 */
    function injectFloatingBtn(): void {
      if (document.getElementById('srb-float-btn')) return;
      const btn = document.createElement('div');
      btn.id = 'srb-float-btn';
      btn.innerHTML = '🛡';
      btn.title = '屏蔽此网站';
      btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;width:48px;height:48px;border-radius:50%;background:#007bff;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);user-select:none;transition:transform 0.15s;';
      btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
      btn.onmouseleave = () => { btn.style.transform = ''; };

      const popup = document.createElement('div');
      popup.id = 'srb-float-popup';
      popup.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:none;flex-direction:column;min-width:160px;overflow:hidden;';
      popup.innerHTML = '<button class="srb-fopt" data-action="domain" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;border-bottom:1px solid #eee;">🌐 屏蔽此域名</button><button class="srb-fopt" data-action="url" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;">🔗 屏蔽此链接</button>';

      btn.onclick = (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; };

      popup.onclick = async (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('srb-fopt')) return;
        const action = target.getAttribute('data-action');
        if (action === 'domain') await addDomain(getHostname());
        else if (action === 'url') await addBlockedUrl(window.location.href);
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

    // 订阅 + 初始化
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
    });

    // ===== Teaching Mode =====
    function generateSelector(el: Element): string | null {
      let parent = el.parentElement;
      let container: Element | null = null;
      let itemTag = '';
      let itemClass = '';

      while (parent && parent !== document.body) {
        const similar = Array.from(parent.children).filter(
          (c) => c.tagName === el.tagName && c.className === el.className,
        );
        if (similar.length >= 3) {
          container = parent;
          itemTag = el.tagName.toLowerCase();
          const cls = el.className.trim();
          itemClass = cls ? cls.split(/\s+/).map((c) => `.${CSS.escape(c)}`).join('') : '';
          break;
        }
        parent = parent.parentElement;
      }

      if (!container) return null;

      const parts: string[] = [];
      let current: Element | null = container;
      while (current && current !== document.body && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        const id = current.id ? `#${CSS.escape(current.id)}` : '';
        const cls = Array.from(current.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join('');
        parts.unshift(`${tag}${id}${cls}`);
        current = current.parentElement;
      }
      const containerSelector = parts.join(' ') || 'body';
      const itemSelector = `${itemTag}${itemClass}`;

      const containerEl = document.querySelector(containerSelector);
      if (!containerEl || containerEl.querySelectorAll(itemSelector).length < 2) return null;
      return JSON.stringify({ containerSelector, itemSelector, linkSelector: 'a[href]' });
    }

    let hlEl: HTMLDivElement | null = null;
    let hoveredEl: Element | null = null;
    let selectedDomPath: { tag: string; cls: string; id: string; el: Element }[] = [];
    let selectedLevel = 0;
    let panelEl: HTMLDivElement | null = null;

    function getTargetEl(): Element | null {
      if (!hoveredEl || selectedDomPath.length === 0) return null;
      const idx = selectedDomPath.length - 1 - selectedLevel;
      return selectedDomPath[Math.min(idx, selectedDomPath.length - 1)]?.el ?? null;
    }

    function updateHl(): void {
      if (!hlEl || !hoveredEl) { if (hlEl) hlEl.style.display = 'none'; return; }
      const el = getTargetEl();
      if (!el) { hlEl.style.display = 'none'; return; }
      const r = el.getBoundingClientRect();
      hlEl.style.display = 'block';
      hlEl.style.left = r.left + window.scrollX + 'px';
      hlEl.style.top = r.top + window.scrollY + 'px';
      hlEl.style.width = r.width + 'px';
      hlEl.style.height = r.height + 'px';
    }

    function renderPanel(locked: boolean, matchCount = 0, config?: any): void {
      if (!panelEl || selectedDomPath.length === 0) return;
      const activeStart = selectedDomPath.length - 1 - selectedLevel;

      const crumbs = selectedDomPath.map((item, i) => {
        const active = i >= activeStart;
        const label = item.id || item.cls || item.tag;
        return `<span class="srb-cr" data-idx="${i}" style="cursor:pointer;display:inline-block;padding:4px 10px;border-radius:4px;${active ? 'background:#007bff;color:#fff;' : 'color:#999;'}font-size:12px;white-space:nowrap;transition:0.1s;">${item.tag}${item.id || item.cls ? ': ' + (item.id || item.cls) : ''}</span>`;
      }).join('<span style="color:#ccc;font-size:10px;"> &gt; </span>');

      if (!locked) {
        panelEl.innerHTML = `<div style="padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-size:13px;font-weight:500;">🎯</span><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:1;min-width:0;">${crumbs}</div></div>`;
      } else {
        panelEl.innerHTML = `<div style="padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-size:13px;font-weight:500;">✅</span><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:1;min-width:0;">${crumbs}</div><span style="font-size:12px;color:#666;">匹配 ${matchCount} 条</span><button id="srb-cfm" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">确定</button><button id="srb-rtry" style="padding:6px 20px;background:#fff;color:#666;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">重选</button></div>`;
      }

      panelEl.querySelectorAll('.srb-cr').forEach((el) => {
        el.addEventListener('click', () => {
          selectedLevel = selectedDomPath.length - 1 - parseInt((el as HTMLElement).dataset.idx!);
          updateHl();
          renderPanel(locked, matchCount, config);
        });
      });
    }

    function removeTeachUI(): void {
      hlEl?.remove(); hlEl = null;
      panelEl?.remove(); panelEl = null;
      hoveredEl = null; selectedDomPath = []; selectedLevel = 0;
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'srb-start-teaching') {
        removeTeachUI();
        selectedLevel = 0;

        hlEl = document.createElement('div');
        hlEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:3px dashed #007bff;background:rgba(0,123,255,0.08);border-radius:4px;display:none;';
        document.body.appendChild(hlEl);

        panelEl = document.createElement('div');
        panelEl.id = 'srb-panel';
        panelEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:1000000;background:#fff;border-top:2px solid #007bff;box-shadow:0 -4px 16px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
        document.body.appendChild(panelEl);

        const onMove = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el.id.startsWith('srb-') || el.closest('#srb-panel')) return;
          hoveredEl = el;
          selectedLevel = 0;
          // 构建 DOM 路径
          const path: typeof selectedDomPath = [];
          let cur: Element | null = el;
          while (cur && cur !== document.body && cur !== document.documentElement) {
            path.unshift({ tag: cur.tagName.toLowerCase(), cls: cur.className.trim().slice(0, 30), id: cur.id ? '#' + cur.id : '', el: cur });
            cur = cur.parentElement;
          }
          selectedDomPath = path;
          updateHl();
          renderPanel(false);
        };

        const onClick = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el.id.startsWith('srb-') || el.closest('#srb-panel')) return;
          e.preventDefault();
          e.stopPropagation();

          document.removeEventListener('mousemove', onMove, true);
          document.removeEventListener('click', onClick, true);

          const target = getTargetEl();
          if (!target) return;

          const result = generateSelector(target);
          if (!result) {
            chrome.runtime.sendMessage({ type: 'srb-teaching-result', success: false, hostname: getHostname(), error: '无法识别搜索结果结构' });
            removeTeachUI();
            return;
          }

          const config = JSON.parse(result);
          config.name = getHostname();
          config.hostname = getHostname();
          const containerEl = document.querySelector(config.containerSelector);
          const matchCount = containerEl ? containerEl.querySelectorAll(config.itemSelector).length : 0;

          renderPanel(true, matchCount, config);

          document.getElementById('srb-cfm')?.addEventListener('click', () => {
            removeTeachUI();
            chrome.runtime.sendMessage({ type: 'srb-teaching-confirm', hostname: getHostname(), config, matchCount });
          });

          document.getElementById('srb-rtry')?.addEventListener('click', () => {
            removeTeachUI();
            chrome.runtime.sendMessage({ type: 'srb-teaching-retry', hostname: getHostname() });
          });
        };

        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('click', onClick, true);
        sendResponse({ started: true });
        return true;
      }

      if (msg.type === 'srb-teaching-retry') {
        removeTeachUI();
        selectedLevel = 0;

        hlEl = document.createElement('div');
        hlEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:3px dashed #007bff;background:rgba(0,123,255,0.08);border-radius:4px;display:none;';
        document.body.appendChild(hlEl);

        panelEl = document.createElement('div');
        panelEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:1000000;background:#fff;border-top:2px solid #007bff;box-shadow:0 -4px 16px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
        document.body.appendChild(panelEl);

        const onMove = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el.id.startsWith('srb-') || el.closest('#srb-panel')) return;
          hoveredEl = el;
          selectedLevel = 0;
          const path: typeof selectedDomPath = [];
          let cur: Element | null = el;
          while (cur && cur !== document.body && cur !== document.documentElement) {
            path.unshift({ tag: cur.tagName.toLowerCase(), cls: cur.className.trim().slice(0, 30), id: cur.id ? '#' + cur.id : '', el: cur });
            cur = cur.parentElement;
          }
          selectedDomPath = path;
          updateHl();
          renderPanel(false);
        };

        const onClick = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el.id.startsWith('srb-') || el.closest('#srb-panel')) return;
          e.preventDefault();
          e.stopPropagation();
          document.removeEventListener('mousemove', onMove, true);
          document.removeEventListener('click', onClick, true);

          const target = getTargetEl();
          if (!target) return;

          const result = generateSelector(target);
          if (!result) {
            chrome.runtime.sendMessage({ type: 'srb-teaching-result', success: false, hostname: getHostname(), error: '无法识别' });
            removeTeachUI();
            return;
          }

          const config = JSON.parse(result);
          config.name = getHostname();
          config.hostname = getHostname();
          const containerEl = document.querySelector(config.containerSelector);
          const matchCount = containerEl ? containerEl.querySelectorAll(config.itemSelector).length : 0;

          renderPanel(true, matchCount, config);

          document.getElementById('srb-cfm')?.addEventListener('click', () => {
            removeTeachUI();
            chrome.runtime.sendMessage({ type: 'srb-teaching-confirm', hostname: getHostname(), config, matchCount });
          });

          document.getElementById('srb-rtry')?.addEventListener('click', () => {
            removeTeachUI();
            chrome.runtime.sendMessage({ type: 'srb-teaching-retry', hostname: getHostname() });
          });
        };

        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('click', onClick, true);
        sendResponse({ retrying: true });
        return true;
      }
    });
  },
});
