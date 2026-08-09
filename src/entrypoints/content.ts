import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import {
  SEARCH_ENGINE_HOSTS,
  SEARCH_ENGINE_MATCH_PATTERNS,
  isSupportedSearchHostname,
} from '@/constants/search-hosts';
import {
  BUILT_IN_ENGINES,
  detectBuiltInSearchResults,
  detectSearchEngine,
  extractSearchQuery,
} from '@/helpers/search-engines';
import type { SearchEngineConfig } from '@/helpers/search-engines';
import { get, subscribe, recordSearch } from '@/utils/storage';
import type { AdDisplayMode } from '@/utils/storage';
import { injectStyles } from '@/utils/styles';
import { activatePicker, deactivatePicker } from '@/helpers/picker';
import { getHostname, extractResultUrl } from '@/utils/url';
import { autoDetectSearchResults } from '@/helpers/detector';
import { subscribeToUrlChanges } from '@/helpers/url-navigation';
import { getScanObserverTarget } from '@/helpers/scan-observer';
import {
  countPageMarkerSummary,
  isPageMarkerSummaryRequest,
} from '@/utils/page-badge';
import {
  initBlocker, syncBlockerState,
  scanBlockedDomains, scanForAds, scanResults,
  applyBlockedSelectors, checkSavedSelectors,
  clearAllMarkers,
  setOnContainerMissing,
} from '@/helpers/ad-blocker';
import { initLocale } from '@/utils/i18n';
import { initSentry } from '@/utils/sentry';
import {
  getTemporaryBlocking,
  isBlockTargetEnabled,
  subscribeTemporaryBlocking,
} from '@/utils/temporary-blocking';
import type { TemporaryBlockingOverrides } from '@/utils/temporary-blocking';

export default defineContentScript({
  matches: SEARCH_ENGINE_MATCH_PATTERNS,
  runAt: 'document_end',
  main(ctx) {
    if (!isSupportedSearchHostname(getHostname())) return;
    initSentry('content');
    // ===== 状态 =====
    let blockedDomains: string[] = [];
    let blockedUrls: string[] = [];
    let blockedSelectors: string[] = [];
    let isEnabled = true;
    let blockAds = false;
    let blockDomains = true;
    let blockUrls = true;
    let blockSelectors = true;
    let persistentBlockAds = false;
    let persistentBlockDomains = true;
    let persistentBlockUrls = true;
    let persistentBlockSelectors = true;
    let temporaryBlocking: TemporaryBlockingOverrides = {};
    let adDisplayMode: AdDisplayMode = 'mark';
    let domainDisplayMode: AdDisplayMode = 'mark';
    let urlDisplayMode: AdDisplayMode = 'mark';
    let selectorDisplayMode: AdDisplayMode = 'mark';
    let blockSubdomains = false;
    let currentEngine: SearchEngineConfig | null = null;
    let scanObserver: MutationObserver | null = null;
    let scanObserverTarget: Element | null = null;
    let scanTimer: number | undefined;

    // ===== 初始化 Blocker（注入依赖）=====
    initBlocker({ getHostname, extractResultUrl });
    setOnContainerMissing(() => tryAutoDetect());

    function pushState(engine?: SearchEngineConfig | null): void {
      syncBlockerState(
        {
          blockedDomains, blockedUrls, blockedSelectors, isEnabled, blockAds, blockDomains,
          blockUrls, blockSelectors, adDisplayMode, domainDisplayMode, urlDisplayMode,
          selectorDisplayMode, blockSubdomains,
        },
        engine ?? currentEngine,
      );
    }

    function applyEffectiveBlockTargets(): void {
      const persistent = {
        blockAds: persistentBlockAds,
        blockDomains: persistentBlockDomains,
        blockUrls: persistentBlockUrls,
        blockSelectors: persistentBlockSelectors,
      };
      blockAds = isBlockTargetEnabled('ad', persistent, temporaryBlocking);
      blockDomains = isBlockTargetEnabled('domain', persistent, temporaryBlocking);
      blockUrls = isBlockTargetEnabled('url', persistent, temporaryBlocking);
      blockSelectors = isBlockTargetEnabled('selector', persistent, temporaryBlocking);
    }

    function applyStorageState(storage: Awaited<ReturnType<typeof get>>): void {
      blockedDomains = storage.urls;
      blockedUrls = storage.blockedUrls;
      blockedSelectors = storage.blockedSelectors;
      isEnabled = storage.enabled;
      persistentBlockAds = storage.blockAds ?? false;
      persistentBlockDomains = storage.blockDomains ?? true;
      persistentBlockUrls = storage.blockUrls ?? true;
      persistentBlockSelectors = storage.blockSelectors ?? true;
      applyEffectiveBlockTargets();
      adDisplayMode = storage.adDisplayMode ?? 'mark';
      domainDisplayMode = storage.domainDisplayMode ?? 'mark';
      urlDisplayMode = storage.urlDisplayMode ?? 'mark';
      selectorDisplayMode = storage.selectorDisplayMode ?? 'mark';
      blockSubdomains = storage.blockSubdomains ?? false;
    }

    function runDynamicScan(engine: SearchEngineConfig | null = currentEngine): void {
      if (!isEnabled) return;
      // 百度翻页时可能重建 <head>，导致插件样式节点被移除。
      // 每次动态扫描都重新确认样式存在，避免新标记退化成普通文本。
      injectStyles();
      pushState(engine);
      scanBlockedDomains();
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

      injectStyles();
      clearAllMarkers({ preserveCounts: true, clearPageCount: false });
      pushState();
      scanBlockedDomains();
      if (currentEngine) {
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
    }

    function startMarking(): void {
      if (!isEnabled) return;
      injectStyles();
      autoDetectRetries = 0;
      pushState();
      scanBlockedDomains();
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
        searchEngineHosts: [...SEARCH_ENGINE_HOSTS],
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
      injectStyles();
      autoDetectRetries++;
      const detected = detectBuiltInSearchResults(window.location.href)
        ?? autoDetectSearchResults(getHostname);
      if (!detected) { ctx.setTimeout(() => { if (isEnabled) void tryAutoDetect(); }, 3000); return; }
      const containerEl = document.querySelector(detected.containerSelector);
      if (!containerEl || containerEl.querySelectorAll(detected.itemSelector).length < 2) {
        ctx.setTimeout(() => { if (isEnabled) void tryAutoDetect(); }, 3000);
        return;
      }
      currentEngine = detected;
      pushState();
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
        if (storage.recordSearchHistory) {
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
      pushState();
      recordCurrentSearch();
      ctx.addEventListener(document, 'srb-start-picker', () => {
        if (isEnabled) activatePicker(getHostname);
      });
      browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === 'srb-start-picker' && isEnabled) {
          activatePicker(getHostname);
        }
        if (isPageMarkerSummaryRequest(message)) {
          sendResponse(countPageMarkerSummary());
        }
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

    const unsubscribeTemporaryBlocking = subscribeTemporaryBlocking((value) => {
      temporaryBlocking = value;
      applyEffectiveBlockTargets();
      rescanWithCurrentState();
    });
    ctx.onInvalidated(unsubscribeTemporaryBlocking);

    const unsubscribeUrlChanges = subscribeToUrlChanges(handleUrlChange);
    ctx.onInvalidated(unsubscribeUrlChanges);

    ctx.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      void Promise.all([get(), getTemporaryBlocking()]).then(([storage, temporary]) => {
        temporaryBlocking = temporary;
        applyStorageState(storage);
        recordCurrentSearch();
        rescanWithCurrentState();
      });
    });

    ctx.addEventListener(window, 'pageshow', () => {
      void Promise.all([get(), getTemporaryBlocking()]).then(([storage, temporary]) => {
        temporaryBlocking = temporary;
        applyStorageState(storage);
        rescanWithCurrentState();
      });
    });

    // ===== 启动 =====

    Promise.all([get(), getTemporaryBlocking()]).then(([storage, temporary]) => {
      temporaryBlocking = temporary;
      applyStorageState(storage);
      init(storage);
    });
  },
});
