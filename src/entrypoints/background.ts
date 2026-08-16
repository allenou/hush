import { defineBackground } from 'wxt/utils/define-background';
import { browser, type Browser } from 'wxt/browser';
import { WEB_PAGE_MATCH_PATTERNS } from '@/constants/context-menu';
import {
  SEARCH_ENGINE_MATCH_PATTERNS,
  isSupportedSearchHostname,
} from '@/constants/search-hosts';
import { findMatchingBlockedDomainIndex } from '@/utils/domain';
import { addBlockedUrl, addDomain, get, removeBlockedItem } from '@/utils/storage';
import {
  PAGE_MARKER_REPORT_REQUEST,
  isPageMarkerCountMessage,
  isPageMarkerSummaryRequest,
} from '@/utils/page-badge';
import type { PageMarkerSummary } from '@/utils/page-badge';
import { isDomainHomepageUrl } from '@/utils/url';
import { initSentry } from '@/utils/sentry';
import { clearTemporaryBlocking } from '@/utils/temporary-blocking';

const CONTEXT_MENU = {
  root: 'hush-root',
  picker: 'hush-picker',
  domain: 'hush-block-domain',
  url: 'hush-block-url',
} as const;

interface ContextMenuShownData {
  linkUrl?: string;
  pageUrl?: string;
}

interface DynamicContextMenus {
  onShown?: {
    addListener: (
      listener: (info: ContextMenuShownData, tab?: Browser.tabs.Tab) => void,
    ) => void;
  };
  refresh?: () => Promise<void>;
}

function getDynamicContextMenus(): typeof browser.contextMenus & DynamicContextMenus {
  return browser.contextMenus as typeof browser.contextMenus & DynamicContextMenus;
}

function parseHttpUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isSupportedSearchPage(value: string | undefined): boolean {
  const url = parseHttpUrl(value);
  return url ? isSupportedSearchHostname(url.hostname) : false;
}

export async function updateShownContextMenus(info: ContextMenuShownData): Promise<void> {
  const target = parseHttpUrl(info.linkUrl ?? info.pageUrl);
  const searchPage = isSupportedSearchPage(info.pageUrl);
  const showRuleActions = Boolean(target) && (!searchPage || Boolean(info.linkUrl));
  const storage = target ? await get() : null;
  const domain = target?.hostname.replace(/^www\./, '') ?? '';
  const domainBlocked = Boolean(storage && findMatchingBlockedDomainIndex(
    domain,
    storage.urls,
    storage.blockSubdomains ?? false,
  ) >= 0);
  const urlBlocked = Boolean(storage && target && storage.blockedUrls.includes(target.href));
  const domainOnly = target ? isDomainHomepageUrl(target.href) : false;

  await Promise.all([
    browser.contextMenus.update(CONTEXT_MENU.picker, {
      visible: searchPage,
    }),
    browser.contextMenus.update(CONTEXT_MENU.domain, {
      title: domainBlocked
        ? browser.i18n.getMessage('unblockDomain') || 'Unblock this domain'
        : browser.i18n.getMessage('blockDomain') || 'Block this domain',
      visible: showRuleActions,
    }),
    browser.contextMenus.update(CONTEXT_MENU.url, {
      title: urlBlocked
        ? browser.i18n.getMessage('unblockUrl') || 'Unblock this URL'
        : browser.i18n.getMessage('blockUrl') || 'Block this URL',
      visible: showRuleActions && !domainOnly,
    }),
  ]);
  await getDynamicContextMenus().refresh?.();
}

async function toggleDomainBlock(domain: string): Promise<void> {
  const storage = await get();
  const blockedIndex = findMatchingBlockedDomainIndex(
    domain,
    storage.urls,
    storage.blockSubdomains ?? false,
  );
  if (blockedIndex >= 0) {
    await removeBlockedItem('domain', blockedIndex);
    return;
  }
  await addDomain(domain);
}

async function toggleUrlBlock(url: string): Promise<void> {
  const storage = await get();
  const blockedIndex = storage.blockedUrls.indexOf(url);
  if (blockedIndex >= 0) {
    await removeBlockedItem('url', blockedIndex);
    return;
  }
  await addBlockedUrl(url);
}

async function createContextMenus(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: CONTEXT_MENU.root,
    title: browser.i18n.getMessage('contextMenuTitle') || 'Hush - Block unwanted pages',
    contexts: ['page', 'link'],
    documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
  });
  browser.contextMenus.create({
    id: CONTEXT_MENU.picker,
    parentId: CONTEXT_MENU.root,
    title: browser.i18n.getMessage('pickAction') || 'Pick & Mark',
    contexts: ['page', 'link'],
    documentUrlPatterns: SEARCH_ENGINE_MATCH_PATTERNS,
  });
  browser.contextMenus.create({
    id: CONTEXT_MENU.domain,
    parentId: CONTEXT_MENU.root,
    title: browser.i18n.getMessage('blockDomain') || 'Block this domain',
    contexts: ['page', 'link'],
    documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
  });
  browser.contextMenus.create({
    id: CONTEXT_MENU.url,
    parentId: CONTEXT_MENU.root,
    title: browser.i18n.getMessage('blockUrl') || 'Block this URL',
    contexts: ['page', 'link'],
    documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
  });
}

function updateTabBadge(tabId: number, count: number): void {
  const text = count > 0 ? String(count) : '';
  void browser.action.setBadgeText({ tabId, text });
}

const EMPTY_PAGE_MARKER_SUMMARY: PageMarkerSummary = {
  count: 0,
  adCount: 0,
  domainCount: 0,
  urlCount: 0,
  selectorCount: 0,
};

export default defineBackground(() => {
  const pageMarkerSummaries = new Map<number, PageMarkerSummary>();
  const pendingSummaryRequests = new Map<number, Set<(summary: PageMarkerSummary) => void>>();

  function publishPageMarkerSummary(tabId: number, summary: PageMarkerSummary): void {
    pageMarkerSummaries.set(tabId, summary);
    updateTabBadge(tabId, summary.count);
    pendingSummaryRequests.get(tabId)?.forEach((resolve) => resolve(summary));
    pendingSummaryRequests.delete(tabId);
  }

  function requestPageMarkerSummary(tabId: number): Promise<PageMarkerSummary> {
    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout>;
      const finish = (summary: PageMarkerSummary) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        pendingSummaryRequests.get(tabId)?.delete(finish);
        resolve(summary);
      };

      const waiters = pendingSummaryRequests.get(tabId) ?? new Set();
      waiters.add(finish);
      pendingSummaryRequests.set(tabId, waiters);

      timeoutId = setTimeout(() => {
        finish(pageMarkerSummaries.get(tabId) ?? { ...EMPTY_PAGE_MARKER_SUMMARY });
      }, 300);

      void browser.tabs.sendMessage(tabId, {
        type: PAGE_MARKER_REPORT_REQUEST,
      }).catch(() => {
        finish(pageMarkerSummaries.get(tabId) ?? { ...EMPTY_PAGE_MARKER_SUMMARY });
      });
    });
  }

  initSentry('background');
  // 清除旧版本留下的全局累计 Badge，仅保留每个标签页自己的计数。
  void browser.action.setBadgeText({ text: '' });
  void browser.action.setBadgeBackgroundColor({ color: '#c00' });
  void createContextMenus();
  browser.runtime.onInstalled.addListener(() => {
    void clearTemporaryBlocking();
    void createContextMenus();
  });
  browser.runtime.onStartup.addListener(() => {
    void clearTemporaryBlocking();
  });

  // Edge 未实现 onShown / refresh；缺少它们时保持静态菜单，避免后台 Worker 启动失败。
  getDynamicContextMenus().onShown?.addListener((info) => {
    void updateShownContextMenus(info).catch(() => {});
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU.picker) {
      if (tab?.id !== undefined) {
        void browser.tabs.sendMessage(tab.id, { type: 'hush-start-picker' }).catch(() => {});
      }
      return;
    }

    const target = parseHttpUrl(info.linkUrl ?? info.pageUrl);
    if (!target) return;

    const domain = target.hostname.replace(/^www\./, '');
    if (info.menuItemId === CONTEXT_MENU.domain) {
      void toggleDomainBlock(domain).catch(() => {});
    } else if (info.menuItemId === CONTEXT_MENU.url) {
      void toggleUrlBlock(target.href).catch(() => {});
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isPageMarkerCountMessage(message)) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return;
      publishPageMarkerSummary(tabId, {
        count: message.count,
        adCount: message.adCount ?? 0,
        domainCount: message.domainCount ?? 0,
        urlCount: message.urlCount ?? 0,
        selectorCount: message.selectorCount ?? 0,
      });
      return;
    }

    if (isPageMarkerSummaryRequest(message)) {
      void requestPageMarkerSummary(message.tabId).then(sendResponse);
      return true;
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      publishPageMarkerSummary(tabId, { ...EMPTY_PAGE_MARKER_SUMMARY });
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    pageMarkerSummaries.delete(tabId);
    pendingSummaryRequests.delete(tabId);
  });
});
