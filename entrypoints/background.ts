import { defineBackground } from 'wxt/utils/define-background';
import { get } from '@/utils/storage';

async function updateBadge(): Promise<void> {
  const { blockCount } = await get();
  const text = blockCount > 0 ? String(blockCount) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#c00' });
}

export default defineBackground(() => {
  updateBadge();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blocker) {
      updateBadge();
    }
  });
});
