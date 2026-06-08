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

      const container =
        document.querySelector(currentEngine.containerSelector) ?? document.body;
      const observer = new MutationObserver(
        debounce(() => {
          if (currentEngine) scanResults(currentEngine);
        }, 300),
      );
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

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'srb-start-teaching') {
        // 注入遮罩提示
        const overlay = document.createElement('div');
        overlay.id = 'srb-teaching-overlay';
        overlay.style.cssText = [
          'position: fixed; inset: 0; z-index: 999999;',
          'background: rgba(0,0,0,0.3); display: flex;',
          'align-items: center; justify-content: center;',
        ].join(' ');
        overlay.innerHTML =
          '<div style="background:#fff;padding:20px 30px;border-radius:8px;font-size:16px;box-shadow:0 4px 20px rgba(0,0,0,0.2);">🎯 请点击任意一条搜索结果</div>';
        document.body.appendChild(overlay);

        // 等待用户点击
        const handler = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          overlay.remove();
          document.removeEventListener('click', handler, true);

          const result = generateSelector(e.target as Element);
          if (!result) {
            chrome.runtime.sendMessage({
              type: 'srb-teaching-result',
              success: false,
              hostname: getHostname(),
              error: '无法识别搜索结果结构，请重试',
            });
            return;
          }

          chrome.runtime.sendMessage({
            type: 'srb-teaching-result',
            success: true,
            hostname: getHostname(),
            config: {
              ...JSON.parse(result),
              name: '',
              hostname: getHostname(),
            },
          });
        };
        document.addEventListener('click', handler, true);

        sendResponse({ started: true });
        return true;
      }
    });
  },
});
