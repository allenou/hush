import { defineBackground } from 'wxt/utils/define-background';
import { isPageMarkerCountMessage } from '@/utils/page-badge';

function updateTabBadge(tabId: number, count: number): void {
  const text = count > 0 ? String(count) : '';
  void chrome.action.setBadgeText({ tabId, text });
}

export default defineBackground(() => {
  // 清除旧版本留下的全局累计 Badge，仅保留每个标签页自己的计数。
  void chrome.action.setBadgeText({ text: '' });
  void chrome.action.setBadgeBackgroundColor({ color: '#c00' });

  chrome.runtime.onMessage.addListener((message, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined || !isPageMarkerCountMessage(message)) return;
    updateTabBadge(tabId, message.count);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') updateTabBadge(tabId, 0);
  });
});
