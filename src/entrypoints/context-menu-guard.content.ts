import { defineContentScript } from 'wxt/utils/define-content-script';
import { LOCAL_PAGE_MATCH_PATTERNS } from '@/constants/context-menu';
import { SEARCH_ENGINE_MATCH_PATTERNS } from '@/constants/search-hosts';

export default defineContentScript({
  matches: [...SEARCH_ENGINE_MATCH_PATTERNS, ...LOCAL_PAGE_MATCH_PATTERNS],
  runAt: 'document_start',
  main(ctx) {
    const hideContextMenu = (): void => {
      void chrome.runtime.sendMessage({
        type: 'srb-context-menu-availability',
        available: false,
      }).catch(() => {});
    };

    // 必须在页面加载时提前隐藏；等到右键事件发生后再更新原生菜单已经来不及。
    hideContextMenu();
    ctx.addEventListener(document, 'pointerdown', (event) => {
      if ((event as PointerEvent).button === 2) hideContextMenu();
    }, true);
    ctx.addEventListener(document, 'contextmenu', hideContextMenu, true);
  },
});
