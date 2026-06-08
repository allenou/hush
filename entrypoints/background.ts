import { defineBackground } from 'wxt/sandbox';
import { extractDomain } from '../utils/domain';
import { isSearchEngine } from '../utils/search-engines';
import { addDomain, get } from '../utils/storage';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      type: 'normal',
      title: '标记为垃圾网站',
      id: 'block-site',
      contexts: ['all'],
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'block-site') return;
    if (!tab?.url) return;

    try {
      const { enabled } = await get();
      if (!enabled) return;

      const domain = extractDomain(tab.url);
      if (domain) {
        await addDomain(domain);
      }
    } catch (err) {
      console.error('[SRB] Failed to block domain:', err);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab?.url || !isSearchEngine(tab.url)) return;

    get().then(({ enabled }) => {
      if (!enabled) return;
      chrome.scripting
        .executeScript({
          target: { tabId },
          files: ['content-scripts/content.js'],
        })
        .catch(() => {});
    });
  });
});
