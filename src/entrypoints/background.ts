import { defineBackground } from 'wxt/utils/define-background';
import {
  isRestrictedContextMenuUrl,
  WEB_PAGE_MATCH_PATTERNS,
} from '@/constants/context-menu';
import { SEARCH_ENGINE_MATCH_PATTERNS } from '@/constants/search-hosts';
import { findMatchingBlockedDomainIndex } from '@/utils/domain';
import { addBlockedUrl, addDomain, get, recordBlock, removeBlockedItem } from '@/utils/storage';
import { isPageMarkerCountMessage } from '@/utils/page-badge';
import { isDomainHomepageUrl } from '@/utils/url';

const CONTEXT_MENU = {
  root: 'srb-root',
  picker: 'srb-picker',
  domain: 'srb-block-domain',
  url: 'srb-block-url',
} as const;

interface ContextTargetStateMessage {
  type: 'srb-context-domain-state';
  domainBlocked: boolean;
  urlBlocked: boolean;
  domainOnly: boolean;
}

interface ContextMenuAvailabilityMessage {
  type: 'srb-context-menu-availability';
  available: boolean;
}

interface ToggleResult {
  blocked: boolean;
  shouldRecord: boolean;
}

function isContextTargetStateMessage(message: unknown): message is ContextTargetStateMessage {
  return Boolean(message)
    && typeof message === 'object'
    && (message as ContextTargetStateMessage).type === 'srb-context-domain-state'
    && typeof (message as ContextTargetStateMessage).domainBlocked === 'boolean'
    && typeof (message as ContextTargetStateMessage).urlBlocked === 'boolean'
    && typeof (message as ContextTargetStateMessage).domainOnly === 'boolean';
}

function isContextMenuAvailabilityMessage(message: unknown): message is ContextMenuAvailabilityMessage {
  return Boolean(message)
    && typeof message === 'object'
    && (message as ContextMenuAvailabilityMessage).type === 'srb-context-menu-availability'
    && typeof (message as ContextMenuAvailabilityMessage).available === 'boolean';
}

export async function updateContextMenuAvailability(available: boolean): Promise<void> {
  await chrome.contextMenus.update(CONTEXT_MENU.root, { visible: available });
}

export async function updateTargetContextMenus(
  state: Omit<ContextTargetStateMessage, 'type'>,
): Promise<void> {
  await Promise.all([
    chrome.contextMenus.update(CONTEXT_MENU.domain, {
      title: state.domainBlocked
        ? chrome.i18n.getMessage('unblockDomain') || 'Unblock this domain'
        : chrome.i18n.getMessage('blockDomain') || 'Block this domain',
    }),
    chrome.contextMenus.update(CONTEXT_MENU.url, {
      title: state.urlBlocked
        ? chrome.i18n.getMessage('unblockUrl') || 'Unblock this URL'
        : chrome.i18n.getMessage('blockUrl') || 'Block this URL',
      visible: !state.domainOnly,
    }),
  ]);
}

async function toggleDomainBlock(domain: string): Promise<ToggleResult> {
  const storage = await get();
  const blockedIndex = findMatchingBlockedDomainIndex(
    domain,
    storage.urls,
    storage.blockSubdomains ?? true,
  );
  if (blockedIndex >= 0) {
    await removeBlockedItem('domain', blockedIndex);
    return { blocked: false, shouldRecord: false };
  }
  await addDomain(domain);
  return { blocked: true, shouldRecord: true };
}

async function toggleUrlBlock(url: string): Promise<ToggleResult> {
  const storage = await get();
  const blockedIndex = storage.blockedUrls.indexOf(url);
  if (blockedIndex >= 0) {
    await removeBlockedItem('url', blockedIndex);
    return { blocked: false, shouldRecord: false };
  }
  await addBlockedUrl(url);
  return { blocked: true, shouldRecord: true };
}

function resetContextMenus(): void {
  void Promise.all([
    updateContextMenuAvailability(true),
    updateTargetContextMenus({
      domainBlocked: false,
      urlBlocked: false,
      domainOnly: false,
    }),
  ]).catch(() => {});
}

async function syncContextMenusForTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  await Promise.all([
    updateContextMenuAvailability(!isRestrictedContextMenuUrl(tab.url)),
    updateTargetContextMenus({
      domainBlocked: false,
      urlBlocked: false,
      domainOnly: false,
    }),
  ]);
}

function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('contextMenuTitle') || 'Hush - Block unwanted pages',
      contexts: ['page', 'link'],
      documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU.picker,
      parentId: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('pickAction') || 'Pick & Mark',
      contexts: ['page', 'link'],
      documentUrlPatterns: SEARCH_ENGINE_MATCH_PATTERNS,
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU.domain,
      parentId: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('blockDomain') || 'Block this domain',
      contexts: ['page', 'link'],
      documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU.url,
      parentId: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('blockUrl') || 'Block this URL',
      contexts: ['page', 'link'],
      documentUrlPatterns: [...WEB_PAGE_MATCH_PATTERNS],
    });
  });
}

function updateTabBadge(tabId: number, count: number): void {
  const text = count > 0 ? String(count) : '';
  void chrome.action.setBadgeText({ tabId, text });
}

export default defineBackground(() => {
  // 清除旧版本留下的全局累计 Badge，仅保留每个标签页自己的计数。
  void chrome.action.setBadgeText({ text: '' });
  void chrome.action.setBadgeBackgroundColor({ color: '#c00' });
  createContextMenus();
  chrome.runtime.onInstalled.addListener(createContextMenus);
  void chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then(([tab]) => tab?.id === undefined ? undefined : syncContextMenusForTab(tab.id))
    .catch(() => {});

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU.picker) {
      if (tab?.id !== undefined) {
        void chrome.tabs.sendMessage(tab.id, { type: 'srb-start-picker' }).catch(() => {});
      }
      return;
    }

    const targetUrl = info.linkUrl ?? info.pageUrl;
    if (!targetUrl) return;
    let target: URL;
    try {
      target = new URL(targetUrl);
    } catch {
      return;
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return;

    const domain = target.hostname.replace(/^www\./, '');
    if (info.menuItemId === CONTEXT_MENU.domain) {
      void toggleDomainBlock(domain)
        .then(async ({ blocked, shouldRecord }) => {
          const storage = await get();
          await updateTargetContextMenus({
            domainBlocked: blocked,
            urlBlocked: storage.blockedUrls.includes(target.href),
            domainOnly: isDomainHomepageUrl(target.href),
          });
          if (shouldRecord) await recordBlock('domain', domain);
        })
        .catch(() => {});
    } else if (info.menuItemId === CONTEXT_MENU.url) {
      void toggleUrlBlock(target.href)
        .then(async ({ blocked, shouldRecord }) => {
          const storage = await get();
          await updateTargetContextMenus({
            domainBlocked: findMatchingBlockedDomainIndex(
              domain,
              storage.urls,
              storage.blockSubdomains ?? true,
            ) >= 0,
            urlBlocked: blocked,
            domainOnly: isDomainHomepageUrl(target.href),
          });
          if (shouldRecord) await recordBlock('url', domain);
        })
        .catch(() => {});
    }
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (isContextMenuAvailabilityMessage(message)) {
      // 菜单可见性是全局状态，后台标签页不能覆盖当前活动标签页。
      if (sender.tab?.active === false) return;
      void updateContextMenuAvailability(message.available).catch(() => {});
      return;
    }
    if (isContextTargetStateMessage(message)) {
      void updateTargetContextMenus(message).catch(() => {});
      return;
    }
    const tabId = sender.tab?.id;
    if (tabId === undefined || !isPageMarkerCountMessage(message)) return;
    updateTabBadge(tabId, message.count);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      updateTabBadge(tabId, 0);
      void syncContextMenusForTab(tabId).catch(resetContextMenus);
    }
  });
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void syncContextMenusForTab(tabId).catch(resetContextMenus);
  });
});
