import { defineContentScript } from 'wxt/utils/define-content-script';
import { BUILT_IN_ENGINES, normalizeHostname, detectSearchEngine, extractSearchQuery } from '@/helpers/search-engines';
import type { SearchEngineConfig } from '@/helpers/search-engines';
import { addCustomEngine, findMatchingCustomEngine, get, subscribe, recordSearch } from '@/utils/storage';
import { injectStyles } from '@/utils/styles';
import { activatePicker, deactivatePicker } from '@/helpers/picker';
import { getHostname, extractResultUrl } from '@/utils/url';
import { autoDetectSearchResults, shouldPersistAutoDetectedEngine } from '@/helpers/detector';
import { injectFloatingBtn, injectCollapseBar } from '@/helpers/ui';
import { getScanObserverTarget } from '@/helpers/scan-observer';
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
  main(ctx) {
    // ===== 状态 =====
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let blockedSelectors: string[] = [];
    let isEnabled = true;
    let blockAds = true;
    let blockSubdomains = true;
    let currentEngine: SearchEngineConfig | null = null;
    let scanObserver: MutationObserver | null = null;
    let scanObserverTarget: Element | null = null;
    let scanTimer: number | undefined;

    // ===== 初始化 Blocker（注入依赖）=====
    initBlocker({ getHostname, extractResultUrl });
    setOnContainerMissing(() => tryAutoDetect());

    function pushState(engine?: SearchEngineConfig | null): void {
      syncBlockerState(
        { blockedDomains, blockedUrls, blockedSelectors, isEnabled, blockAds, blockSubdomains },
        engine ?? currentEngine,
      );
    }

    function applyStorageState(storage: Awaited<ReturnType<typeof get>>): void {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      blockAds = storage.blockAds ?? true;
      blockSubdomains = storage.blockSubdomains ?? true;
    }

    function runDynamicScan(engine: SearchEngineConfig | null = currentEngine): void {
      if (!isEnabled) return;
      pushState(engine);
      if (engine) scanResults(engine);
      else scanForAds();
      applyBlockedSelectors();
    }

    function rescanWithCurrentState(): void {
      pushState();

      if (!isEnabled) {
        disconnectScanObserver();
        restoreBlockedSelectors();
        clearAllMarkers();
        return;
      }

      clearAllMarkers();
      pushState();
      if (currentEngine) scanResults(currentEngine);
      else scanForAds();
      applyBlockedSelectors();
      setupScanObserver();
    }

    function disconnectScanObserver(): void {
      if (scanTimer) {
        clearTimeout(scanTimer);
        scanTimer = undefined;
      }
      scanObserver?.disconnect();
      scanObserver = null;
      scanObserverTarget = null;
    }

    function setupScanObserver(): void {
      const target = getScanObserverTarget({
        engine: currentEngine,
        blockedSelectors,
        hostname: getHostname(),
        searchEngineHosts: BUILT_IN_ENGINES.map((engine) => engine.hostname),
      });
      if (target === scanObserverTarget && scanObserver) return;

      disconnectScanObserver();
      if (!target) return;

      scanObserverTarget = target;
      scanObserver = new MutationObserver(() => {
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = ctx.setTimeout(() => {
          if (!currentEngine) {
            autoDetectRetries = 0;
            void tryAutoDetect();
          }
          runDynamicScan();
        }, 300);
      });
      scanObserver.observe(target, { childList: true, subtree: true });
    }

    // ===== 引擎自动检测 =====

    let autoDetectRetries = 0;
    const MAX_AUTO_DETECT_RETRIES = 6;

    async function tryAutoDetect(): Promise<void> {
      if (autoDetectRetries >= MAX_AUTO_DETECT_RETRIES) return;
      autoDetectRetries++;
      const detected = autoDetectSearchResults(getHostname);
      if (!detected) { ctx.setTimeout(() => tryAutoDetect(), 3000); return; }
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        ctx.setTimeout(() => tryAutoDetect(), 3000);
        return;
      }
      const hostname = getHostname();
      const isBuiltIn = BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(hostname));
      if (!isBuiltIn && shouldPersistAutoDetectedEngine(detected)) {
        const { confidence: _confidence, itemCount: _itemCount, ...engineConfig } = detected;
        await addCustomEngine(engineConfig);
      }
      currentEngine = detected;
      pushState();
      injectCollapseBar(detected.containerSelector);
      scanResults(detected);
      setupScanObserver();
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
    ctx.addEventListener(window, 'popstate', () => {
      if (window.location.href !== lastSearchUrl) {
        lastSearchUrl = window.location.href;
        recordCurrentSearch();
      }
    });

    // ===== 入口 =====

    async function init(storage: Awaited<ReturnType<typeof get>>): Promise<void> {
      if (storage.locale) {
        await initLocale(storage.locale);
      } else {
        await initLocale();
      }
      const hostname = getHostname();
      injectStyles();
      await injectFloatingBtn(ctx);
      pushState();
      recordCurrentSearch();
      ctx.addEventListener(document, 'srb-start-picker', () => activatePicker(getHostname));

      // 尝试从已存自定义引擎加载
      currentEngine = findMatchingCustomEngine(storage.customEngines, {
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
          setupScanObserver();
          return;
        }
        currentEngine = null;
      }

      // 引擎检测
      if (BUILT_IN_ENGINES.some((e) => e.hostname === normalizeHostname(hostname))) {
        await tryAutoDetect();
      } else {
        ctx.setTimeout(() => tryAutoDetect(), 2000);
      }

      // 首屏扫描 + 兜底扫描
      pushState();
      scanForAds();
      ctx.setTimeout(() => { pushState(); scanForAds(); }, 1500);
      setupScanObserver();
    }
    ctx.onInvalidated(() => {
      disconnectScanObserver();
      deactivatePicker();
      setOnContainerMissing(() => {});
    });

    // ===== Storage 订阅 =====

    const unsubscribeStorage = subscribe((storage) => {
      applyStorageState(storage);
      rescanWithCurrentState();
    });
    ctx.onInvalidated(unsubscribeStorage);

    // ===== 启动 =====

    get().then((storage) => {
      applyStorageState(storage);
      init(storage);
      checkSavedSelectors();
    });
  },
});
