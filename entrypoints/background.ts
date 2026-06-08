import { defineBackground } from 'wxt/utils/define-background';
import { extractDomain } from '../utils/domain';
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
});
