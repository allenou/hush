export const PAGE_MARKER_COUNT_MESSAGE = 'srb-page-marker-count';
export const PAGE_MARKER_SUMMARY_REQUEST = 'srb-get-page-marker-summary';

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
  return (message as Partial<PageMarkerSummaryRequest>).type === PAGE_MARKER_SUMMARY_REQUEST;
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

export function countPageMarkerSummary(root: ParentNode = document): PageMarkerSummary {
  let domainCount = 0;
  let urlCount = 0;
  let selectorCount = 0;

  root.querySelectorAll<HTMLElement>('.srb-blocked-badge, [data-srb-rule-hidden]').forEach((badge) => {
    if (badge.dataset.ruleType === 'domain') {
      domainCount++;
    } else if (badge.dataset.ruleType === 'url') {
      urlCount++;
    } else {
      selectorCount++;
    }
  });

  const adCount = root.querySelectorAll('[data-srb-ad-hidden], .srb-ad-badge').length;
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
