import { defineBackground } from 'wxt/utils/define-background';
import { SEARCH_ENGINE_MATCH_PATTERNS } from '@/constants/search-hosts';
import { addBlockedUrl, addDomain, recordBlock } from '@/utils/storage';
import { isPageMarkerCountMessage } from '@/utils/page-badge';

const CONTEXT_MENU = {
  root: 'srb-root',
  picker: 'srb-picker',
  domain: 'srb-block-domain',
  url: 'srb-block-url',
} as const;

function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('contextMenuTitle') || 'Hush - Block unwanted pages',
      contexts: ['page', 'link'],
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
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU.url,
      parentId: CONTEXT_MENU.root,
      title: chrome.i18n.getMessage('blockUrl') || 'Block this URL',
      contexts: ['page', 'link'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
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
      void addDomain(domain).then(() => recordBlock('domain', domain));
    } else if (info.menuItemId === CONTEXT_MENU.url) {
      void addBlockedUrl(target.href).then(() => recordBlock('url', domain));
    }
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined || !isPageMarkerCountMessage(message)) return;
    updateTabBadge(tabId, message.count);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') updateTabBadge(tabId, 0);
  });
});
