export const PAGE_MARKER_COUNT_MESSAGE = 'srb-page-marker-count';

export interface PageMarkerCountMessage {
  type: typeof PAGE_MARKER_COUNT_MESSAGE;
  count: number;
}

export function isPageMarkerCountMessage(message: unknown): message is PageMarkerCountMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as Partial<PageMarkerCountMessage>;
  return candidate.type === PAGE_MARKER_COUNT_MESSAGE
    && typeof candidate.count === 'number'
    && Number.isInteger(candidate.count)
    && candidate.count >= 0;
}

export function countPageMarkers(root: ParentNode = document): number {
  return root.querySelectorAll('.srb-blocked-badge, .srb-ad-badge').length;
}

export function reportPageMarkerCount(root: ParentNode = document): void {
  const message: PageMarkerCountMessage = {
    type: PAGE_MARKER_COUNT_MESSAGE,
    count: countPageMarkers(root),
  };
  void chrome.runtime.sendMessage(message).catch(() => {
    // 扩展上下文失效或后台尚未就绪时忽略，后续扫描会再次同步。
  });
}

export function clearPageMarkerCount(): void {
  const message: PageMarkerCountMessage = {
    type: PAGE_MARKER_COUNT_MESSAGE,
    count: 0,
  };
  void chrome.runtime.sendMessage(message).catch(() => {
    // 扩展上下文失效时无需继续清理。
  });
}
