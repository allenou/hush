import { defineContentScript } from 'wxt/utils/define-content-script';
import { SEARCH_ENGINE_MATCH_PATTERNS, isSupportedSearchHostname } from '@/constants/search-hosts';
import { BUILT_IN_ENGINES, detectSearchEngine, extractSearchQuery } from '@/helpers/search-engines';
import type { SearchEngineConfig } from '@/helpers/search-engines';
import { get, subscribe, recordSearch } from '@/utils/storage';
import { injectStyles } from '@/utils/styles';
import { activatePicker, deactivatePicker } from '@/helpers/picker';
import { getHostname, extractResultUrl } from '@/utils/url';
import { autoDetectSearchResults } from '@/helpers/detector';
import { injectFloatingBtn, injectCollapseBar, setFloatingMarkingEnabled } from '@/helpers/ui';
import { subscribeToUrlChanges } from '@/helpers/url-navigation';
import { getScanObserverTarget } from '@/helpers/scan-observer';
import {
  initBlocker, syncBlockerState,
  scanForAds, scanResults,
  applyBlockedSelectors, checkSavedSelectors,
  clearAllMarkers,
  setOnContainerMissing,
} from '@/helpers/ad-blocker';
import { initLocale } from '@/utils/i18n';

export default defineContentScript({
  matches: SEARCH_ENGINE_MATCH_PATTERNS,
  runAt: 'document_end',
  main(ctx) {
    if (!isSupportedSearchHostname(getHostname())) return;
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
        stopMarking();
        return;
      }

      clearAllMarkers({ preserveCounts: true, removeCollapse: false });
      pushState();
      if (currentEngine) {
        injectCollapseBar(currentEngine.containerSelector);
        scanResults(currentEngine);
      } else {
        autoDetectRetries = 0;
        void tryAutoDetect();
        scanForAds();
      }
      applyBlockedSelectors();
      setupScanObserver();
    }

    function stopMarking(): void {
      disconnectScanObserver();
      deactivatePicker();
      currentEngine = null;
      autoDetectRetries = 0;
      clearAllMarkers({ preserveCounts: true });
      setFloatingMarkingEnabled(false);
    }

    function startMarking(): void {
      if (!isEnabled) return;
      injectStyles();
      setFloatingMarkingEnabled(true);
      autoDetectRetries = 0;
      pushState();
      void tryAutoDetect();
      scanForAds();
      ctx.setTimeout(() => {
        if (!isEnabled) return;
        pushState();
        scanForAds();
      }, 1500);
      setupScanObserver();
      checkSavedSelectors();
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
          if (window.location.href !== lastSearchUrl) {
            handleUrlChange(window.location.href);
            return;
          }
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
      if (!isEnabled) return;
      if (autoDetectRetries >= MAX_AUTO_DETECT_RETRIES) return;
      autoDetectRetries++;
      const detected = autoDetectSearchResults(getHostname);
      if (!detected) { ctx.setTimeout(() => { if (isEnabled) void tryAutoDetect(); }, 3000); return; }
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        ctx.setTimeout(() => { if (isEnabled) void tryAutoDetect(); }, 3000);
        return;
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
    function handleUrlChange(url: string): void {
      if (url === lastSearchUrl) return;
      lastSearchUrl = url;
      recordCurrentSearch();
      if (!isEnabled) return;
      disconnectScanObserver();
      currentEngine = null;
      clearAllMarkers({ preserveCounts: true });
      startMarking();
    }

    // ===== 入口 =====

    async function init(storage: Awaited<ReturnType<typeof get>>): Promise<void> {
      if (storage.locale) {
        await initLocale(storage.locale);
      } else {
        await initLocale();
      }
      setFloatingMarkingEnabled(storage.enabled);
      await injectFloatingBtn(ctx);
      pushState();
      recordCurrentSearch();
      ctx.addEventListener(document, 'srb-start-picker', () => {
        if (isEnabled) activatePicker(getHostname);
      });
      if (isEnabled) startMarking();
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

    const unsubscribeUrlChanges = subscribeToUrlChanges(handleUrlChange);
    ctx.onInvalidated(unsubscribeUrlChanges);

    ctx.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      void get().then((storage) => {
        applyStorageState(storage);
        recordCurrentSearch();
        rescanWithCurrentState();
      });
    });

    ctx.addEventListener(window, 'pageshow', () => {
      void get().then((storage) => {
        applyStorageState(storage);
        rescanWithCurrentState();
      });
    });

    // ===== 启动 =====

    get().then((storage) => {
      applyStorageState(storage);
      init(storage);
    });
  },
});
