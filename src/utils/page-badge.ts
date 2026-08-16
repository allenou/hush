export const PAGE_MARKER_COUNT_MESSAGE = 'hush-page-marker-count';
export const PAGE_MARKER_SUMMARY_REQUEST = 'hush-get-page-marker-summary';
export const PAGE_MARKER_REPORT_REQUEST = 'hush-report-page-marker-summary';

export interface PageMarkerSummary {
  count: number;
  adCount: number;
  domainCount: number;
  urlCount: number;
  selectorCount: number;
}

export interface PageMarkerCountMessage {
  type: typeof PAGE_MARKER_COUNT_MESSAGE;
  count: number;
  adCount?: number;
  domainCount?: number;
  urlCount?: number;
  selectorCount?: number;
}

export interface PageMarkerSummaryRequest {
  type: typeof PAGE_MARKER_SUMMARY_REQUEST;
  tabId: number;
}

export interface PageMarkerReportRequest {
  type: typeof PAGE_MARKER_REPORT_REQUEST;
}

export function isPageMarkerCountMessage(message: unknown): message is PageMarkerCountMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as Partial<PageMarkerCountMessage>;
  return candidate.type === PAGE_MARKER_COUNT_MESSAGE
    && typeof candidate.count === 'number'
    && Number.isInteger(candidate.count)
    && candidate.count >= 0;
}

export function isPageMarkerSummaryRequest(message: unknown): message is PageMarkerSummaryRequest {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as Partial<PageMarkerSummaryRequest>;
  return candidate.type === PAGE_MARKER_SUMMARY_REQUEST
    && typeof candidate.tabId === 'number'
    && Number.isInteger(candidate.tabId)
    && candidate.tabId >= 0;
}

export function isPageMarkerReportRequest(message: unknown): message is PageMarkerReportRequest {
  if (!message || typeof message !== 'object') return false;
  return (message as Partial<PageMarkerReportRequest>).type === PAGE_MARKER_REPORT_REQUEST;
}

export function isPageMarkerSummary(value: unknown): value is PageMarkerSummary {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PageMarkerSummary>;
  return [
    candidate.count,
    candidate.adCount,
    candidate.domainCount,
    candidate.urlCount,
    candidate.selectorCount,
  ].every((count) =>
    typeof count === 'number'
    && Number.isInteger(count)
    && count >= 0,
  );
}

/**
 * 标记必须在真实页面中占有可见布局空间。JSDOM 等无布局环境下根节点尺寸为 0，
 * 此时只依据 CSS 可见性判断，避免测试环境与浏览器行为耦合。
 */
export function isVisiblePageMarker(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none'
      || style.visibility === 'hidden'
      || style.visibility === 'collapse'
      || Number.parseFloat(style.opacity) === 0) return false;
    current = current.parentElement;
  }

  const rootRect = document.documentElement.getBoundingClientRect();
  if (rootRect.width <= 0 && rootRect.height <= 0) return true;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getRuleType(element: HTMLElement): 'domain' | 'url' | 'selector' {
  const ruleType = element.dataset.ruleType ?? element.dataset.hushRuleType;
  if (ruleType === 'domain' || ruleType === 'url') return ruleType;
  return 'selector';
}

export function countPageMarkerSummary(root: ParentNode = document): PageMarkerSummary {
  let domainCount = 0;
  let urlCount = 0;
  let selectorCount = 0;

  root.querySelectorAll<HTMLElement>('.hush-blocked-badge').forEach((badge) => {
    if (!isVisiblePageMarker(badge)) return;
    const ruleType = getRuleType(badge);
    if (ruleType === 'domain') {
      domainCount++;
    } else if (ruleType === 'url') {
      urlCount++;
    } else {
      selectorCount++;
    }
  });

  root.querySelectorAll<HTMLElement>('[data-hush-rule-hidden]').forEach((element) => {
    const ruleType = getRuleType(element);
    if (ruleType === 'domain') {
      domainCount++;
    } else if (ruleType === 'url') {
      urlCount++;
    } else {
      selectorCount++;
    }
  });

  const visibleAdCount = Array.from(root.querySelectorAll<HTMLElement>('.hush-ad-badge'))
    .filter(isVisiblePageMarker)
    .length;
  const adCount = root.querySelectorAll('[data-hush-ad-hidden]').length + visibleAdCount;
  return {
    count: adCount + domainCount + urlCount + selectorCount,
    adCount,
    domainCount,
    urlCount,
    selectorCount,
  };
}

export function countPageMarkers(root: ParentNode = document): number {
  return countPageMarkerSummary(root).count;
}

export function reportPageMarkerCount(root: ParentNode = document): void {
  const summary = countPageMarkerSummary(root);
  const message: PageMarkerCountMessage = {
    type: PAGE_MARKER_COUNT_MESSAGE,
    ...summary,
  };
  void browser.runtime.sendMessage(message).catch(() => {
    // 扩展上下文失效或后台尚未就绪时忽略，后续扫描会再次同步。
  });
}

export function clearPageMarkerCount(): void {
  const message: PageMarkerCountMessage = {
    type: PAGE_MARKER_COUNT_MESSAGE,
    count: 0,
    adCount: 0,
    domainCount: 0,
    urlCount: 0,
    selectorCount: 0,
  };
  void browser.runtime.sendMessage(message).catch(() => {
    // 扩展上下文失效时无需继续清理。
  });
}
import { browser } from 'wxt/browser';
