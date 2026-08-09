import { defineBackground } from 'wxt/utils/define-background';
import { browser, type Browser } from 'wxt/browser';
import { WEB_PAGE_MATCH_PATTERNS } from '@/constants/context-menu';
import {
  SEARCH_ENGINE_MATCH_PATTERNS,
  isSupportedSearchHostname,
} from '@/constants/search-hosts';
import { findMatchingBlockedDomainIndex } from '@/utils/domain';
import { addBlockedUrl, addDomain, get, recordBlock, removeBlockedItem } from '@/utils/storage';
import { isPageMarkerCountMessage } from '@/utils/page-badge';
import { isDomainHomepageUrl } from '@/utils/url';
import { initSentry } from '@/utils/sentry';
import { clearTemporaryBlocking } from '@/utils/temporary-blocking';

const CONTEXT_MENU = {
  root: 'srb-root',
  picker: 'srb-picker',
  domain: 'srb-block-domain',
  url: 'srb-block-url',
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

interface ToggleResult {
  shouldRecord: boolean;
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

async function toggleDomainBlock(domain: string): Promise<ToggleResult> {
  const storage = await get();
  const blockedIndex = findMatchingBlockedDomainIndex(
    domain,
    storage.urls,
    storage.blockSubdomains ?? false,
  );
  if (blockedIndex >= 0) {
    await removeBlockedItem('domain', blockedIndex);
    return { shouldRecord: false };
  }
  await addDomain(domain);
  return { shouldRecord: true };
}

async function toggleUrlBlock(url: string): Promise<ToggleResult> {
  const storage = await get();
  const blockedIndex = storage.blockedUrls.indexOf(url);
  if (blockedIndex >= 0) {
    await removeBlockedItem('url', blockedIndex);
    return { shouldRecord: false };
  }
  await addBlockedUrl(url);
  return { shouldRecord: true };
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

export default defineBackground(() => {
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
        void browser.tabs.sendMessage(tab.id, { type: 'srb-start-picker' }).catch(() => {});
      }
      return;
    }

    const target = parseHttpUrl(info.linkUrl ?? info.pageUrl);
    if (!target) return;

    const domain = target.hostname.replace(/^www\./, '');
    if (info.menuItemId === CONTEXT_MENU.domain) {
      void toggleDomainBlock(domain)
        .then(async ({ shouldRecord }) => {
          if (shouldRecord) await recordBlock('domain', domain);
        })
        .catch(() => {});
    } else if (info.menuItemId === CONTEXT_MENU.url) {
      void toggleUrlBlock(target.href)
        .then(async ({ shouldRecord }) => {
          if (shouldRecord) await recordBlock('url', domain);
        })
        .catch(() => {});
    }
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined || !isPageMarkerCountMessage(message)) return;
    updateTabBadge(tabId, message.count);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      updateTabBadge(tabId, 0);
    }
  });
});
