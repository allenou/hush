import { getSearchEngineRule } from './search-engines';
import type { SearchEngineConfig } from './search-engines';
import { get, removeBlockedItem, removeBlockedSelectorEntry, recordBlock } from '@/utils/storage';
import type { DomainBlockKind } from '@/utils/storage';
import type { AdDisplayMode } from '@/utils/storage';
import { clearPageMarkerCount, reportPageMarkerCount } from '@/utils/page-badge';
import { t } from '@/utils/i18n';
import { matchesBlockedDomain } from '@/utils/domain';
import {
  extractAnchorAttributeUrls,
  extractAnchorSpanUrls,
  extractSogouLinkUrls,
} from '@/utils/url';
import { lockBadgeTypography } from '@/utils/styles';

// ========== Module State ==========

export interface BlockerState {
  blockedDomains: string[];
  blockedUrls: string[];
  blockedSelectors: string[];
  isEnabled: boolean;
  blockAds: boolean;
  /** 未设置时保持旧版行为，确保已有调用兼容。 */
  blockDomains?: boolean;
  blockUrls?: boolean;
  blockSelectors?: boolean;
  adDisplayMode?: AdDisplayMode;
  domainDisplayMode?: AdDisplayMode;
  urlDisplayMode?: AdDisplayMode;
  selectorDisplayMode?: AdDisplayMode;
  blockSubdomains: boolean;
}

let _state: BlockerState;
let _currentEngine: SearchEngineConfig | null = null;
let _getHostname: () => string = () => '';
let _extractResultUrl: (item: Element, selector: string) => string | null = () => null;

export function initBlocker(config: {
  getHostname: () => string;
  extractResultUrl: (item: Element, selector: string) => string | null;
}): void {
  _getHostname = config.getHostname;
  _extractResultUrl = config.extractResultUrl;
}

export function syncBlockerState(state: BlockerState, engine: SearchEngineConfig | null): void {
  _state = state;
  _currentEngine = engine;
}

// ========== Utilities ==========

/** 从 URL 提取 hostname，失败返回 null */
function tryParseHostname(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function isSearchEngineTrackingDomain(domain: string): boolean {
  const currentHost = _getHostname().replace(/^www\./, '');
  if (domain === currentHost || domain.endsWith(`.${currentHost}`)) return true;
  return ['googleadservices.com', 'doubleclick.net'].some((host) =>
    domain === host || domain.endsWith(`.${host}`),
  );
}

async function recordBlockOnce(
  item: Element,
  type: 'ad' | 'domain' | 'url' | 'selector',
  domain?: string,
  domainKind?: DomainBlockKind,
): Promise<void> {
  if (item.hasAttribute('data-hush-counted')) return;
  item.setAttribute('data-hush-counted', 'true');
  try {
    await recordBlock(type, domain, domainKind, _getHostname());
  } catch (error) {
    item.removeAttribute('data-hush-counted');
    throw error;
  }
}

/** 在域名列表中查找匹配，返回 index 或 -1 */
function matchBlockedDomain(href: string, domains: string[], includeSubdomains = _state.blockSubdomains): number {
  const hostname = tryParseHostname(href);
  if (!hostname) return -1;
  return domains.findIndex((domain) =>
    matchesBlockedDomain(hostname, [domain], includeSubdomains),
  );
}

// ========== Ad Structure Detection ==========

/** 判断搜索结果项是否包含广告标记 */
export function isAdItem(item: Element): boolean {
  const engine = getSearchEngineRule(_getHostname());
  if (!engine) return false;

  if (engine.isAdItem?.(item)) return true;

  if (engine.adItemSelectors?.some((selector) =>
    item.matches(selector) || Boolean(item.querySelector(selector)),
  )) return true;

  const cls = (item.className as string).toLowerCase();
  if (/\b(?:ad|sponsor)\b/.test(cls)) return true;
  return false;
}

/** 从搜索结果项向上查找完整广告容器（而非单行），找不到则返回 null */
export function findAdContainer(item: Element): Element | null {
  return findContentContainer(item);
}

/** 从已命中的元素向上查找完整内容块，供广告和域名规则共用 */
function findContentContainer(source: Element): HTMLElement | null {
  let cur: HTMLElement | null = source.parentElement;
  let hintedDiv: HTMLElement | null = null;
  let fallbackDiv: HTMLElement | null = null;
  let depth = 0;

  while (cur && cur !== document.body && depth < 10) {
    const tag = cur.tagName.toLowerCase();
    if (tag === 'header' || tag === 'nav' || tag === 'footer' || tag === 'aside') break;

    const hasLink = cur.querySelector('a');
    if (hasLink) {
      if (['li', 'article', 'section', 'tr', 'dl'].includes(tag) && isReasonableContentSize(cur)) {
        return cur;
      }
      if (cur.hasAttribute('data-srcid') && isReasonableContentSize(cur)) {
        return cur;
      }
      if (tag === 'div') {
        const cls = cur.className.toLowerCase();
        if (!hintedDiv && /(^|[-_\s])(result|res|item|card|entry|article|algo)([-_\s]|$)/.test(cls)) {
          hintedDiv = cur;
        }
        if (!fallbackDiv && cur.children.length >= 2 && (cur.textContent ?? '').trim().length >= 20) {
          fallbackDiv = cur;
        }
      }
    }

    cur = cur.parentElement;
    depth++;
  }

  const best = hintedDiv ?? fallbackDiv;
  return best && isReasonableContentSize(best) ? best : null;
}

function isReasonableContentSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  return viewportArea <= 0 || rect.width * rect.height <= viewportArea * 0.6;
}

/** 隐藏或尚未获得布局尺寸的广告槽不注入标记，等待后续 DOM 变化后重试。 */
function isRenderableAdTarget(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
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

// ========== UI Injection ==========

function rememberTargetUrl(item: Element, href: string): void {
  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      item.setAttribute('data-hush-target-url', url.href);
    }
  } catch {
    // 无效链接不记录。
  }
}

export function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
  const ruleType = domainMatch ? 'domain' : 'url';
  const displayMode = ruleType === 'domain'
    ? (_state.domainDisplayMode ?? 'mark')
    : (_state.urlDisplayMode ?? 'mark');
  if (displayMode === 'hide' && item.hasAttribute('data-hush-rule-hidden')) return;
  if (displayMode === 'mark' && item.querySelector('.hush-blocked-badge')) return;
  rememberTargetUrl(item, href);
  if (displayMode === 'hide') {
    // 仅修改当前页面的呈现，不拦截请求或改写页面网络通信。
    item.setAttribute('data-hush-rule-hidden', 'true');
    item.setAttribute('data-hush-rule-type', ruleType);
    return;
  }
  const mask = document.createElement('div');
  mask.className = 'hush-mask';
  (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

  const badge = document.createElement('div');
  badge.className = 'hush-blocked-badge';
  badge.setAttribute('role', 'button');
  badge.tabIndex = 0;
  lockBadgeTypography(badge);

  function renderRuleBadge(type: 'domain' | 'url'): void {
    const cancelText = type === 'domain' ? t('cancelDomain') : t('cancelUrl');
    badge.dataset.ruleType = type;
    badge.textContent = type === 'domain'
      ? `🌐 ${t('domainHit')}`
      : `🔗 ${t('urlHit')}`;
    badge.title = cancelText;
    badge.setAttribute('aria-label', cancelText);
  }

  renderRuleBadge(ruleType);

  let removing = false;
  badge.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (removing) return;
    removing = true;
    badge.setAttribute('aria-disabled', 'true');
    try {
      const current = await get();
      const includeSubdomains = current.blockSubdomains ?? false;
      const domainIndex = matchBlockedDomain(href, current.urls, includeSubdomains);
      const urlIndex = current.blockedUrls.indexOf(href);
      const ruleType = badge.dataset.ruleType === 'url' ? 'url' : 'domain';

      if (ruleType === 'domain' && domainIndex >= 0) {
        await removeBlockedItem('domain', domainIndex);
      } else if (ruleType === 'url' && urlIndex >= 0) {
        await removeBlockedItem('url', urlIndex);
      }

      const latest = await get();
      const hasDomainRule = matchBlockedDomain(
        href,
        latest.urls,
        latest.blockSubdomains ?? false,
      ) >= 0;
      const hasUrlRule = latest.blockedUrls.includes(href);

      if (!hasDomainRule) item.removeAttribute('data-hush-domain-blocked');
      if (hasDomainRule) {
        renderRuleBadge('domain');
      } else if (hasUrlRule) {
        renderRuleBadge('url');
      } else {
        mask.remove();
        badge.remove();
      }
      reportPageMarkerCount();
    } finally {
      removing = false;
      if (badge.isConnected) badge.removeAttribute('aria-disabled');
    }
  });
  badge.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    badge.click();
  });

  item.appendChild(mask);
  item.appendChild(badge);
}

export function injectAdBadge(item: Element, href: string): boolean {
  const adDisplayMode = _state.adDisplayMode ?? 'mark';
  // 一个明确广告容器的祖先或后代已经完成标记时，不再为重叠候选重复注入。
  if (item.parentElement?.closest('[data-hush-ad-scanned]')) return true;
  if (item.querySelector('[data-hush-ad-scanned]')) return true;
  if (adDisplayMode === 'hide' && item.hasAttribute('data-hush-ad-hidden')) return true;
  if (adDisplayMode === 'mark' && item.querySelector('.hush-ad-badge')) return true;
  if (!isRenderableAdTarget(item)) return false;
  if (href) rememberTargetUrl(item, href);
  const adHref = href || item.querySelector<HTMLAnchorElement>('a[href]')?.href || '';
  const parsedDomain = tryParseHostname(adHref);
  const domain = parsedDomain && !isSearchEngineTrackingDomain(parsedDomain)
    ? parsedDomain
    : undefined;
  void recordBlockOnce(item, 'ad', domain).catch(() => {});
  if (adDisplayMode === 'hide') {
    // 仅修改当前页面的呈现，不拦截广告请求或改写页面网络通信。
    item.setAttribute('data-hush-ad-hidden', 'true');
    item.setAttribute('data-hush-ad-scanned', 'true');
    return true;
  }

  const mask = document.createElement('div');
  mask.className = 'hush-ad-mask';
  (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

  const badge = document.createElement('div');
  badge.className = 'hush-ad-badge';
  lockBadgeTypography(badge);
  badge.textContent = `📢 ${t('adBadge')}`;
  badge.title = t('adBadgeTitle');
  badge.addEventListener('click', () => {
    mask.remove();
    badge.remove();
    reportPageMarkerCount();
  });
  item.appendChild(mask);
  item.appendChild(badge);
  item.setAttribute('data-hush-ad-scanned', 'true');
  return true;
}

function clearActionMarkers(item: Element): void {
  item.querySelectorAll('.hush-block-btn, .hush-popup, .hush-ad-mask, .hush-ad-badge').forEach((el) => el.remove());
}

function applyBlockedRuleMarker(item: Element, href: string): boolean {
  const di = _state.blockDomains === false ? -1 : matchBlockedDomain(href, _state.blockedDomains);
  const urlMatch = _state.blockUrls === false ? false : _state.blockedUrls.includes(href);
  if (di < 0 && !urlMatch) return false;

  const domain = tryParseHostname(href) ?? undefined;
  const matchedDomain = di >= 0 ? _state.blockedDomains[di] : undefined;
  const domainKind = matchedDomain && domain !== matchedDomain ? 'subdomain' : 'target';
  void recordBlockOnce(item, di >= 0 ? 'domain' : 'url', domain, domainKind).catch(() => {});
  clearActionMarkers(item);
  injectBadge(item, di >= 0, urlMatch, href);
  return true;
}

/**
 * 从结果链接中查找命中的域名，再向上定位并标记所属内容块。
 * 搜狗使用明确的 linkurl 属性及链接子 span 的可见地址文本，其他引擎继续遍历链接属性。
 * 该扫描不依赖搜索引擎配置或自动检测结果。
 */
export function scanBlockedDomains(): void {
  if (!_state.isEnabled || _state.blockDomains === false || _state.blockedDomains.length === 0) return;

  const currentHostname = _getHostname().replace(/^www\./, '');
  const isSogouPage = currentHostname === 'sogou.com';
  const preferredResultSelector = isSogouPage
    ? '.vrwrap'
    : currentHostname === 'so.com'
      ? '.res-list'
      : null;
  const matchedContainers = new Map<HTMLElement, string>();
  document.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    if (link.closest('.hush-popup, .hush-blocked-badge')) return;
    if (link.closest('[data-hush-domain-blocked]')) return;

    const candidateUrls = isSogouPage
      ? [...extractSogouLinkUrls(link), ...extractAnchorSpanUrls(link)]
      : extractAnchorAttributeUrls(link);
    const matchedUrl = candidateUrls.find(
      (url) => matchBlockedDomain(url, _state.blockedDomains) >= 0,
    );
    if (!matchedUrl) return;

    // 搜狗和 360 优先遮罩各自的完整结果容器，找不到时再使用通用定位。
    const container = (preferredResultSelector
      ? link.closest<HTMLElement>(preferredResultSelector)
      : null)
      ?? findContentContainer(link);
    if (!container || matchedContainers.has(container)) return;
    matchedContainers.set(container, matchedUrl);
  });

  const containers = Array.from(matchedContainers.keys());
  matchedContainers.forEach((matchedUrl, container) => {
    // 同一结果中可能嵌套多个命中链接，只标记最外层的完整内容块。
    if (containers.some((candidate) => candidate !== container && candidate.contains(container))) return;
    if (applyBlockedRuleMarker(container, matchedUrl)) {
      container.setAttribute('data-hush-domain-blocked', 'true');
    }
  });

  reportPageMarkerCount();
}

// ========== Item Processing ==========

export function processItem(item: Element): void {
  if (!_state.isEnabled) return;
  if (item.closest('[data-hush-domain-blocked]')) return;
  const wasProcessed = item.hasAttribute('data-hush-processed');
  if (!_currentEngine) return;
  const href = _extractResultUrl(item, _currentEngine.linkSelector);
  if (!href) { return; }
  if (wasProcessed) {
    applyBlockedRuleMarker(item, href);
    return;
  }

  item.setAttribute('data-hush-processed', 'true');
  if (applyBlockedRuleMarker(item, href)) return;
  else if (_state.blockAds && isAdItem(item)) {
    const adContainer = findAdContainer(item);
    const injected = adContainer
      ? injectAdBadge(adContainer, href)
      : injectAdBadge(item, href);
    if (!injected) item.removeAttribute('data-hush-processed');
  }
}

export function scanResults(engine: SearchEngineConfig): void {
  if (!_state.isEnabled) return;
  const container = document.querySelector(engine.containerSelector);
  if (!container) { setTimeout(() => _onContainerMissing(), 500); return; }
  container.querySelectorAll(engine.itemSelector).forEach((item) => processItem(item));
  scanForAds();
  reportPageMarkerCount();
}

// ========== Ad Scanning ==========

/** 广告扫描 — 仅处理引擎通过专属 DOM 结构明确返回的广告容器。 */
export function scanForAds(): void {
  if (!_state.blockAds || !_state.isEnabled) {
    reportPageMarkerCount();
    return;
  }

  const engine = getSearchEngineRule(_getHostname());
  if (!engine) {
    reportPageMarkerCount();
    return;
  }

  const candidates = Array.from(new Set(engine.findAdContainers?.(document) ?? []));
  const containers = candidates.filter((element) =>
    !candidates.some((candidate) => candidate !== element && candidate.contains(element)),
  );

  containers.forEach((element) => {
    // 搜索引擎可能异步重写广告容器内容，导致已注入的遮罩被移除，
    // 但容器上的扫描标记仍保留；此时需要重新注入。
    if (_state.adDisplayMode === 'hide'
      ? element.hasAttribute('data-hush-ad-hidden')
      : Boolean(element.querySelector('.hush-ad-mask, .hush-ad-badge'))) return;
    injectAdBadge(element, '');
  });
  reportPageMarkerCount();
}

// ========== Selector Rules ==========

export function restoreBlockedSelectors(): void {
  if (!_state.isEnabled || _state.blockSelectors === false) return;
  const curHost = _getHostname();
  _state.blockedSelectors.forEach((entry) => {
    const sep = entry.indexOf('||');
    if (sep === -1) return;
    if (entry.slice(0, sep) !== curHost) return;
    try {
      document.querySelectorAll(entry.slice(sep + 2)).forEach((el) => {
        el.querySelectorAll('.hush-mask, .hush-blocked-badge').forEach((b) => b.remove());
        el.removeAttribute('data-hush-rule-hidden');
        el.removeAttribute('data-hush-rule-type');
      });
    } catch { /* skip */ }
  });
  reportPageMarkerCount();
}

export function applyBlockedSelectors(): void {
  if (!_state.isEnabled || _state.blockSelectors === false) return;
  const curHost = _getHostname();
  _state.blockedSelectors.forEach((entry) => {
    const sep = entry.indexOf('||');
    if (sep === -1) return;
    if (entry.slice(0, sep) !== curHost) return;
    const selector = entry.slice(sep + 2);
    try {
      document.querySelectorAll(selector).forEach((el) => {
        void recordBlockOnce(el, 'selector', curHost).catch(() => {});
        if ((_state.selectorDisplayMode ?? 'mark') === 'hide') {
          if (!el.hasAttribute('data-hush-rule-hidden')) {
            el.setAttribute('data-hush-rule-hidden', 'true');
            el.setAttribute('data-hush-rule-type', 'selector');
          }
          return;
        }
        if (el.querySelector('.hush-mask, .hush-blocked-badge')) return;
        (el as HTMLElement).style.position = (el as HTMLElement).style.position || 'relative';
        const mask = document.createElement('div');
        mask.className = 'hush-mask';
        el.appendChild(mask);
        const badge = document.createElement('div');
        badge.className = 'hush-blocked-badge';
        lockBadgeTypography(badge);
        badge.textContent = `🎯 ${t('elementHit')}`;
        badge.title = t('elementBlocked');
        badge.setAttribute('data-entry', entry);
        badge.addEventListener('click', async (event) => {
          event.stopPropagation();
          await removeBlockedSelectorEntry(entry);
          mask.remove();
          badge.remove();
          reportPageMarkerCount();
        });
        el.appendChild(badge);
      });
    } catch { /* skip */ }
  });
  reportPageMarkerCount();
}

export function checkSavedSelectors(): void {
  setTimeout(() => applyBlockedSelectors(), 500);
}

// ========== Cleanup ==========

export function clearAllMarkers(options: { preserveCounts?: boolean; clearPageCount?: boolean } = {}): void {
  document.querySelectorAll('.hush-mask, .hush-blocked-badge, .hush-ad-mask, .hush-ad-badge, .hush-block-btn, .hush-popup').forEach((el) => el.remove());
  document.querySelectorAll('[data-hush-processed], [data-hush-domain-blocked], [data-hush-ad-scanned], [data-hush-ad-badge], [data-hush-ad-hidden], [data-hush-rule-hidden], [data-hush-counted], [data-hush-target-url]').forEach((el) => {
    el.removeAttribute('data-hush-processed');
    el.removeAttribute('data-hush-domain-blocked');
    el.removeAttribute('data-hush-ad-scanned');
    el.removeAttribute('data-hush-ad-badge');
    el.removeAttribute('data-hush-ad-hidden');
    el.removeAttribute('data-hush-rule-hidden');
    el.removeAttribute('data-hush-rule-type');
    el.removeAttribute('data-hush-target-url');
    if (!options.preserveCounts) el.removeAttribute('data-hush-counted');
  });
  if (options.clearPageCount !== false) clearPageMarkerCount();
  else reportPageMarkerCount();
}

// Set by content.ts for container-missing fallback
let _onContainerMissing: () => void = () => {};

export function setOnContainerMissing(fn: () => void): void {
  _onContainerMissing = fn;
}
