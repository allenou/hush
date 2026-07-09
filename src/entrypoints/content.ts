import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, normalizeHostname, detectSearchEngine, extractSearchQuery } from '@/helpers/search-engines';
import type { SearchEngineConfig } from '@/helpers/search-engines';
import { addCustomEngine, findMatchingCustomEngine, get, subscribe, recordSearch } from '@/utils/storage';
import { injectStyles } from '@/utils/styles';
import { activatePicker, deactivatePicker } from '@/helpers/picker';
import { getHostname, extractResultUrl } from '@/utils/url';
import { autoDetectSearchResults } from '@/helpers/detector';
import { injectFloatingBtn, injectCollapseBar } from '@/helpers/ui';
import {
  initBlocker, syncBlockerState,
  scanForAds, scanResults,
  applyBlockedSelectors, checkSavedSelectors,
  restoreBlockedSelectors, clearAllMarkers,
  setOnContainerMissing,
} from '@/helpers/ad-blocker';
import { initLocale } from '@/utils/i18n';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    // ===== 状态 =====
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let blockedSelectors: string[] = [];
    let isEnabled = true;
    let blockAds = true;
    let blockSubdomains = true;
    let currentEngine: SearchEngineConfig | null = null;

    // ===== 初始化 Blocker（注入依赖）=====
    initBlocker({ getHostname, extractResultUrl });
    setOnContainerMissing(() => tryAutoDetect());

    function pushState(engine?: SearchEngineConfig | null): void {
      syncBlockerState(
        { blockedDomains, blockedUrls, blockedSelectors, isEnabled, blockAds, blockSubdomains },
        engine ?? currentEngine,
      );
    }

    // ===== 引擎自动检测 =====

    let autoDetectRetries = 0;
    const MAX_AUTO_DETECT_RETRIES = 6;

    async function tryAutoDetect(): Promise<void> {
      if (autoDetectRetries >= MAX_AUTO_DETECT_RETRIES) return;
      autoDetectRetries++;
      const detected = autoDetectSearchResults(getHostname);
      if (!detected) { setTimeout(() => tryAutoDetect(), 3000); return; }
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        setTimeout(() => tryAutoDetect(), 3000);
        return;
      }
      const hostname = getHostname();
      const isBuiltIn = BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(hostname));
      if (!isBuiltIn) {
        await addCustomEngine(detected);
      }
      currentEngine = detected;
      pushState();
      injectCollapseBar(detected.containerSelector);
      scanResults(detected);
      // 结果容器 observer（翻页检测）
      const c = document.querySelector(detected.containerSelector) ?? document.body;
      new MutationObserver(() => { pushState(); scanResults(detected); scanForAds(); applyBlockedSelectors(); })
        .observe(c, { childList: true, subtree: true });
    }

    // ===== 搜索记录 =====

    function recordCurrentSearch(): void {
      const query = extractSearchQuery(window.location.href);
      if (!query) return;
      const engine = detectSearchEngine(window.location.href);
      if (!engine) return;
      // 检查用户是否开启了搜索记录
      get().then((storage) => {
        if (storage.recordSearchHistory !== false) {
          recordSearch(query, engine.name, engine.hostname);
        }
      });
    }

    // ===== SPA 导航检测 =====

    let lastSearchUrl = window.location.href;
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastSearchUrl) {
        lastSearchUrl = window.location.href;
        recordCurrentSearch();
      }
    });

    // ===== 入口 =====

    async function init(): Promise<void> {
      const storage = await get();
      if (storage.locale) {
        await initLocale(storage.locale);
      } else {
        await initLocale();
      }
      const hostname = getHostname();
      injectStyles();
      injectFloatingBtn();
      pushState();
      recordCurrentSearch();
      document.addEventListener('srb-start-picker', () => activatePicker(getHostname));

      // 尝试从已存自定义引擎加载
      const { customEngines } = await get();
      currentEngine = findMatchingCustomEngine(customEngines, {
        hostname,
        pathname: window.location.pathname,
      });
      if (currentEngine) {
        const testContainer = document.querySelector(currentEngine.containerSelector);
        const testItems = testContainer ? testContainer.querySelectorAll(currentEngine.itemSelector) : [];
        if (testContainer && testItems.length >= 4) {
          pushState();
          injectCollapseBar(currentEngine.containerSelector);
          scanResults(currentEngine);
          const c = document.querySelector(currentEngine.containerSelector) ?? document.body;
          new MutationObserver(() => { pushState(); scanResults(currentEngine!); scanForAds(); applyBlockedSelectors(); })
            .observe(c, { childList: true, subtree: true });
          return;
        }
        currentEngine = null;
      }

      // 引擎检测
      if (BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(hostname))) {
        await tryAutoDetect();
      } else {
        setTimeout(() => tryAutoDetect(), 2000);
      }

      // 首屏扫描 + 兜底扫描
      pushState();
      scanForAds();
      setTimeout(() => { pushState(); scanForAds(); }, 1500);
    }

    // ===== 全 DOM Observer（防抖 300ms，监听无限加载）=====

    let obsTimer: ReturnType<typeof setTimeout>;
    const globalObserver = new MutationObserver(() => {
      clearTimeout(obsTimer);
      obsTimer = setTimeout(() => {
        if (!isEnabled) return;
        pushState();
        scanForAds();
        if (currentEngine) scanResults(currentEngine);
        applyBlockedSelectors();
      }, 300);
    });
    globalObserver.observe(document.body, { childList: true, subtree: true });

    // ===== Storage 订阅 =====

    subscribe((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      blockAds = storage.blockAds ?? true;
      blockSubdomains = storage.blockSubdomains ?? true;
      pushState();

      if (!isEnabled) {
        restoreBlockedSelectors();
        clearAllMarkers();
        return;
      }

      clearAllMarkers();
      pushState();
      if (blockAds) scanForAds();
      if (currentEngine) { scanResults(currentEngine); applyBlockedSelectors(); }
    });

    // ===== 启动 =====

    get().then((storage) => {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      blockAds = storage.blockAds ?? true;
      blockSubdomains = storage.blockSubdomains ?? true;
      init();
      checkSavedSelectors();
    });
  },
});
