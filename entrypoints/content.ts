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

      // 检查是否已被屏蔽
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

      item.addEventListener('mouseenter', () => {
        btn.style.display = 'flex';
      });
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
    function injectBadge(
      item: Element,
      domainMatch: boolean,
      urlMatch: boolean,
      href: string,
    ): void {
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

      badge.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        badge.remove();
        const currentDomains = blockedDomains;
        const domain = new URL(href).hostname.replace(/^www\./, '');
        const domainIdx = currentDomains.indexOf(domain);

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

    const debounce = <T extends (...args: unknown[]) => void>(
      fn: T,
      ms: number,
    ): T => {
      let timer: ReturnType<typeof setTimeout>;
      return ((...args: unknown[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      }) as T;
    };

    async function init(): Promise<void> {
      const hostname = getHostname();
      const { customEngines } = await get();
      currentEngine =
        BUILT_IN_ENGINES.find((e) => e.hostname === hostname) ??
        customEngines.find((e) => e.hostname === hostname) ??
        null;
      if (!currentEngine) return;

      injectCollapseBar();
      scanResults(currentEngine);
      injectFloatingBtn();

      const container =
        document.querySelector(currentEngine.containerSelector) ?? document.body;
      const observer = new MutationObserver(
        debounce(() => {
          if (currentEngine) scanResults(currentEngine);
        }, 300),
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
      btn.style.cssText = [
        'position: fixed; bottom: 24px; right: 24px; z-index: 999999;',
        'width: 48px; height: 48px; border-radius: 50%;',
        'background: #007bff; color: #fff; font-size: 22px;',
        'display: flex; align-items: center; justify-content: center;',
        'cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25);',
        'user-select: none; transition: transform 0.15s;',
      ].join(' ');
      btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
      btn.onmouseleave = () => { btn.style.transform = ''; };

      const popup = document.createElement('div');
      popup.id = 'srb-float-popup';
      popup.style.cssText = [
        'position: fixed; bottom: 80px; right: 24px; z-index: 999999;',
        'background: #fff; border: 1px solid #ddd; border-radius: 10px;',
        'box-shadow: 0 4px 16px rgba(0,0,0,0.2); display: none;',
        'flex-direction: column; min-width: 160px; overflow: hidden;',
      ].join(' ');
      popup.innerHTML = [
        '<button class="srb-fopt" data-action="domain" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;border-bottom:1px solid #eee;">🌐 屏蔽此域名</button>',
        '<button class="srb-fopt" data-action="url" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;">🔗 屏蔽此链接</button>',
      ].join(' ');

      btn.onclick = (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
      };

      popup.onclick = async (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('srb-fopt')) return;
        const action = target.getAttribute('data-action');
        const url = window.location.href;
        const domain = getHostname();

        if (action === 'domain') {
          await addDomain(domain);
        } else if (action === 'url') {
          await addBlockedUrl(url);
        }
        await recordBlock();
        popup.style.display = 'none';

        // 短暂反馈
        const orig = btn.innerHTML;
        btn.innerHTML = '✅';
        btn.style.background = '#28a745';
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.background = '#007bff';
        }, 1500);
      };

      // 点击其它区域关闭 popup
      document.addEventListener('click', () => {
        popup.style.display = 'none';
      }, true);

      document.body.appendChild(btn);
      document.body.appendChild(popup);
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
    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      isEnabled = storage.enabled;
      init();
    });

    // ===== Teaching Mode =====
    /** DOM 选择器自动生成 */
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
          itemClass = cls
            ? cls
                .split(/\s+/)
                .map((c) => `.${CSS.escape(c)}`)
                .join('')
            : '';
          break;
        }
        parent = parent.parentElement;
      }

      if (!container) return null;

      // 生成容器选择器路径
      const parts: string[] = [];
      let current: Element | null = container;
      while (current && current !== document.body && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        const id = current.id ? `#${CSS.escape(current.id)}` : '';
        const cls = Array.from(current.classList)
          .slice(0, 2)
          .map((c) => `.${CSS.escape(c)}`)
          .join('');
        parts.unshift(`${tag}${id}${cls}`);
        current = current.parentElement;
      }
      const containerSelector = parts.join(' ') || 'body';
      const itemSelector = `${itemTag}${itemClass}`;

      // 验证
      const containerEl = document.querySelector(containerSelector);
      if (!containerEl) return null;
      const matchCount = containerEl.querySelectorAll(itemSelector).length;
      if (matchCount < 2) return null;

      return JSON.stringify({ containerSelector, itemSelector, linkSelector: 'a[href]' });
    }

    let teachingHighlight: HTMLDivElement | null = null;
    let hoveredEl: Element | null = null;
    let depthOffset = 0;

    function getTargetElement(): Element | null {
      if (!hoveredEl) return null;
      let el: Element = hoveredEl;
      for (let i = 0; i < depthOffset; i++) {
        if (el.parentElement && el.parentElement !== document.body) {
          el = el.parentElement;
        }
      }
      return el;
    }

    function updateHighlight(): void {
      const hl = teachingHighlight;
      if (!hl || !hoveredEl) { if (hl) hl.style.display = 'none'; return; }
      const el = getTargetElement();
      if (!el) { hl.style.display = 'none'; return; }
      const rect = el.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = `${rect.left + window.scrollX}px`;
      hl.style.top = `${rect.top + window.scrollY}px`;
      hl.style.width = `${rect.width}px`;
      hl.style.height = `${rect.height}px`;
      // 更新提示条显示当前标签
      const hint = document.getElementById('srb-teaching-hint');
      if (hint) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className.trim().slice(0, 40);
        hint.innerHTML = `点击标记 · <code style="background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:3px;">&lt;${tag}${cls ? ` class=&quot;${cls}&quot;` : ''}&gt;</code> ${depthOffset > 0 ? ` · 上移 ${depthOffset} 级` : ''} · <span style="font-size:12px;opacity:0.8;">+/- 调整</span>`;
      }
    }

    function removeTeachingHighlight(): void {
      teachingHighlight?.remove();
      teachingHighlight = null;
      hoveredEl = null;
      depthOffset = 0;
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'srb-start-teaching') {
        removeTeachingHighlight();
        depthOffset = 0;

        // 创建高亮框
        const highlight = document.createElement('div');
        highlight.id = 'srb-teaching-highlight';
        highlight.style.cssText = [
          'position: fixed; pointer-events: none; z-index: 999999;',
          'border: 3px dashed #007bff; background: rgba(0,123,255,0.08);',
          'border-radius: 4px; display: none;',
          'transition: all 0.1s ease;',
        ].join(' ');
        document.body.appendChild(highlight);
        teachingHighlight = highlight;

        // 提示条
        const hint = document.createElement('div');
        hint.id = 'srb-teaching-hint';
        hint.style.cssText = [
          'position: fixed; top: 16px; left: 50%; transform: translateX(-50%);',
          'z-index: 1000000; background: #007bff; color: #fff;',
          'padding: 10px 20px; border-radius: 8px; font-size: 14px;',
          'box-shadow: 0 4px 12px rgba(0,0,0,0.2);',
          'white-space: nowrap;',
        ].join(' ');
        hint.textContent = '移动鼠标选择元素，+/- 调整范围';
        document.body.appendChild(hint);

        // 鼠标移动 → 记录悬停元素
        const moveHandler = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el === highlight || el === hint || el.id.startsWith('srb-')) return;
          hoveredEl = el;
          depthOffset = 0;
          updateHighlight();
        };

        // 键盘 + / - 调整深度
        const keyHandler = (e: KeyboardEvent) => {
          if (e.key === '+' || e.key === '=') {
            depthOffset++;
            updateHighlight();
          } else if (e.key === '-' || e.key === '_') {
            if (depthOffset > 0) depthOffset--;
            updateHighlight();
          }
        };

        // 点击 → 发送结果到 Popup 确认
        const clickHandler = (e: MouseEvent) => {
          const el = e.target as Element;
          if (el === highlight || el === hint || el.id.startsWith('srb-')) return;
          e.preventDefault();
          e.stopPropagation();

          document.removeEventListener('mousemove', moveHandler, true);
          document.removeEventListener('click', clickHandler, true);
          document.removeEventListener('keydown', keyHandler, true);
          hint.remove();
          removeTeachingHighlight();

          const target = getTargetElement();
          if (!target) return;

          setTimeout(() => {
            const result = generateSelector(target);
            if (!result) {
              chrome.runtime.sendMessage({
                type: 'srb-teaching-result',
                success: false,
                hostname: getHostname(),
                error: '无法识别搜索结果结构',
              });
              return;
            }

            const config = {
              ...JSON.parse(result),
              name: getHostname(),
              hostname: getHostname(),
            };

            const containerEl = document.querySelector(config.containerSelector);
            const matchCount = containerEl
              ? containerEl.querySelectorAll(config.itemSelector).length
              : 0;

            chrome.runtime.sendMessage({
              type: 'srb-teaching-confirm',
              hostname: getHostname(),
              config,
              matchCount,
            });
          }, 0);
        };

        document.addEventListener('mousemove', moveHandler, true);
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler, true);

        sendResponse({ started: true });

        sendResponse({ started: true });
        return true;
      }

      // Popup 发来重试指令
      if (msg.type === 'srb-teaching-retry') {
        document.addEventListener('mousemove', moveHandler, true);
        document.addEventListener('click', clickHandler, true);
        document.body.appendChild(hint);
        sendResponse({ retrying: true });
        return true;
      }
    });
  },
});
