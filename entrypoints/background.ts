import { defineBackground } from 'wxt/utils/define-background';
import { extractDomain } from '../utils/domain';
import { addDomain, get } from '../utils/storage';

async function updateBadge(): Promise<void> {
  const { blockCount } = await get();
  const text = blockCount > 0 ? String(blockCount) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#c00' });
}

export default defineBackground(() => {
  // 初始化 badge
  updateBadge();

  // 监听 storage 变化更新 badge
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blocker) {
      updateBadge();
    }
  });

  // 右键菜单
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
      if (domain) await addDomain(domain);
    } catch (err) {
      console.error('[SRB] Failed to block domain:', err);
    }
  });
});
