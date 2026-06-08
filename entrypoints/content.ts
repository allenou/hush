import { defineContentScript } from 'wxt/utils/define-content-script';
import { detectSearchEngine } from '../utils/search-engines';
import { get, incrementBlockCount, subscribe } from '../utils/storage';

export default defineContentScript({
  matches: [
    '*://*.google.com/*',
    '*://*.baidu.com/*',
    '*://*.bing.com/*',
    '*://duckduckgo.com/*',
  ],
  runAt: 'document_end',
  main() {
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
  },
});
