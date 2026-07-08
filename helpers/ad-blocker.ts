import type { SearchEngineConfig } from './search-engines';
import { removeBlockedItem, addDomain, addBlockedUrl, recordBlock } from '../utils/storage';
import { updateCollapseBar } from './ui';

// ========== Module State ==========

export interface BlockerState {
  blockedDomains: string[];
  blockedUrls: string[];
  blockedSelectors: string[];
  isEnabled: boolean;
  blockAds: boolean;
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

/** 在域名列表中查找匹配（支持子域名），返回 index 或 -1 */
function matchBlockedDomain(href: string, domains: string[]): number {
  const hostname = tryParseHostname(href);
  if (!hostname) return -1;
  return domains.findIndex((d) => hostname === d || hostname.endsWith('.' + d));
}

// ========== Ad Text Detection ==========

/** 判断搜索结果项是否包含广告标记 */
export function isAdItem(item: Element): boolean {
  if (item.querySelector('[class*="ad-label" i], [aria-label*="ad" i], [aria-label*="sponsor" i], [class*="tuiguang" i], [class*="e-pc-li-131-1" i], [class*="ad-results" i]')) return true;
  const cls = (item.className as string).toLowerCase();
  if (/\b(?:ad|sponsor)\b/.test(cls) || /tuiguang/i.test(cls) || cls.includes('e-pc-li-131-1') || cls.includes('ad-results')) return true;
  for (const el of item.querySelectorAll('span, small, label, em, b, i, div, a, strong, p')) {
    if (el.children.length > 3) continue;
    const t = (el.textContent ?? '').trim();
    if (t.length === 0 || t.length > 20) continue;
    const lower = t.toLowerCase();
    if (lower.includes('广告') || lower.includes('推广') || lower === 'ad' || lower === 'sponsored') { return true; }
  }
  return false;
}

/** 从搜索结果项向上查找完整广告容器（而非单行），找不到则返回 null */
export function findAdContainer(item: Element): Element | null {
  let cur: HTMLElement | null = item.parentElement;
  let depth = 0;
  while (cur && cur !== document.body && depth < 10) {
    const tag = cur.tagName.toLowerCase();
    const children = cur.children.length;
    const hasLink = cur.querySelector('a[href]');
    if (hasLink && children >= 2 && (tag === 'div' || tag === 'li' || tag === 'article' || tag === 'section')) {
      return cur;
    }
    if (cur.hasAttribute('data-srcid')) { return cur; }
    cur = cur.parentElement;
    depth++;
  }
  return null;
}

// ========== UI Injection ==========

export function injectBlockButton(item: Element, href: string): void {
  if (item.querySelector('.srb-block-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'srb-block-btn';
  btn.textContent = '⊕';
  btn.title = '屏蔽此结果';
  (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

  const popup = document.createElement('div');
  popup.className = 'srb-popup';
  popup.innerHTML =
    '<button class="srb-opt" data-action="domain">🌐 屏蔽此域名</button>' +
    '<button class="srb-opt" data-action="url">🔗 屏蔽此链接</button>';

  item.addEventListener('mouseenter', () => { btn.style.display = 'flex'; });
  item.addEventListener('mouseleave', (e) => {
    if (!popup.contains(e.relatedTarget as Node) && e.relatedTarget !== btn) {
      btn.style.display = 'none';
      popup.style.display = 'none';
    }
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
  });
  popup.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const domain = new URL(href).hostname.replace(/^www\./, '');
    if (t.getAttribute('data-action') === 'domain') await addDomain(domain);
    else await addBlockedUrl(href);
    await recordBlock();
    popup.style.display = 'none';
    btn.style.display = 'none';
    btn.remove();
    popup.remove();
    injectBadge(item, t.getAttribute('data-action') === 'domain', t.getAttribute('data-action') === 'url', href);
    updateCollapseBar();
  });
  item.appendChild(btn);
  item.appendChild(popup);
}

export function injectBadge(item: Element, domainMatch: boolean, urlMatch: boolean, href: string): void {
  if (item.querySelector('.srb-blocked-badge')) return;
  const mask = document.createElement('div');
  mask.className = 'srb-mask';
  (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

  const badge = document.createElement('div');
  badge.className = 'srb-blocked-badge';
  badge.textContent = '已屏蔽';
  badge.title = '点击取消屏蔽';
  badge.addEventListener('click', async () => {
    mask.remove();
    badge.remove();
    const di = matchBlockedDomain(href, _state.blockedDomains);
    const ui = _state.blockedUrls.indexOf(href);

    if (di >= 0 && !urlMatch) await removeBlockedItem('domain', di);
    else if (ui >= 0 && di === -1) await removeBlockedItem('url', ui);
    else if (di >= 0 && urlMatch) {
      if (confirm('取消屏蔽此域名？\n确定=是，取消=仅取消此链接')) {
        await removeBlockedItem('domain', di);
      } else if (ui >= 0) {
        await removeBlockedItem('url', ui);
      }
    }
    updateCollapseBar();
  });
  item.appendChild(mask);
  item.appendChild(badge);
}

export function injectAdBadge(item: Element, href: string): void {
  if (item.querySelector('.srb-ad-badge')) return;
  const mask = document.createElement('div');
  mask.className = 'srb-ad-mask';
  (item as HTMLElement).style.position = (item as HTMLElement).style.position || 'relative';

  const badge = document.createElement('div');
  badge.className = 'srb-ad-badge';
  badge.textContent = '📢 广告';
  badge.title = '点击取消屏蔽（临时）';
  badge.addEventListener('click', () => {
    mask.remove();
    badge.remove();
    if (href) injectBlockButton(item, href);
  });
  item.appendChild(mask);
  item.appendChild(badge);
}

// ========== Item Processing ==========

export function processItem(item: Element): void {
  if (item.hasAttribute('data-srb-processed')) return;
  item.setAttribute('data-srb-processed', 'true');
  if (!_currentEngine) return;
  const href = _extractResultUrl(item, _currentEngine.linkSelector);
  if (!href) { return; }
  const di = matchBlockedDomain(href, _state.blockedDomains);
  const urlMatch = _state.blockedUrls.includes(href);
  if (di >= 0 || urlMatch) injectBadge(item, di >= 0, urlMatch, href);
  else if (_state.blockAds && isAdItem(item)) {
    const adContainer = findAdContainer(item);
    if (adContainer) { injectAdBadge(adContainer, href); }
    else { injectAdBadge(item, href); }
  }
  else injectBlockButton(item, href);
}

export function scanResults(engine: SearchEngineConfig): void {
  if (!_state.isEnabled) return;
  const container = document.querySelector(engine.containerSelector);
  if (!container) { setTimeout(() => _onContainerMissing(), 500); return; }
  container.querySelectorAll(engine.itemSelector).forEach((item) => processItem(item));
  scanForAds();
  updateCollapseBar();
}

// ========== Ad Scanning — 3 层策略 ==========

/** 广告扫描 — 优先从上层容器特征找广告，回退从文字标签向上找 */
export function scanForAds(): void {
  if (!_state.blockAds || !_state.isEnabled) return;

  const host = _getHostname();

  // === 策略 1（从上往下）：百度广告容器有 display:block !important;visibility:visible !important; ===
  if (host === 'baidu.com') {
    document.querySelectorAll<HTMLElement>(
      'div[style*="display:block"][style*="visibility:visible"], ' +
      'li[style*="display:block"][style*="visibility:visible"], ' +
      'section[style*="display:block"][style*="visibility:visible"], ' +
      'table[style*="display:block"][style*="visibility:visible"]'
    ).forEach((el) => {
      if (el.hasAttribute('data-srb-ad-scanned')) return;
      if (!el.querySelector('.ec-tuiguang') &&
          !el.textContent?.includes('广告') &&
          !el.textContent?.includes('推广')) return;
      el.setAttribute('data-srb-ad-scanned', 'true');
      injectAdBadge(el, '');
    });
  }

  // === 策略 2：搜索引擎特色类名直接命中 ===
  if (host === 'so.com') {
    document.querySelectorAll<HTMLElement>('.e-pc-li-131-1').forEach((el) => {
      if (el.hasAttribute('data-srb-ad-scanned')) return;
      el.setAttribute('data-srb-ad-scanned', 'true');
      injectAdBadge(el, '');
    });
  }
  if (host === 'sogou.com') {
    document.querySelectorAll<HTMLElement>('.ad-results').forEach((el) => {
      if (el.hasAttribute('data-srb-ad-scanned')) return;
      el.setAttribute('data-srb-ad-scanned', 'true');
      injectAdBadge(el, '');
    });
  }

  // === 策略 3（从下往上）：通过"广告"短文本标签向上找容器（Google/Bing 等）===
  document.querySelectorAll<HTMLElement>(
    'span, small, label, em, i, b, strong, a, ' +
    '[class*="ad-label"], [class*="ad-badge"], [class*="badge"]',
  ).forEach((badge) => {
    if (badge.hasAttribute('data-srb-ad-badge')) return;
    const t = (badge.textContent ?? '').trim();
    if (t.length === 0 || t.length > 20) return;
    if (badge.children.length > 3) return;

    const lower = t.toLowerCase();
    const isAdLabel = t === '广告' || t === '推广' || lower === 'ad' || lower === 'sponsored';
    if (!isAdLabel) return;
    if (badge.closest('[data-srb-ad-scanned]')) return;
    badge.setAttribute('data-srb-ad-badge', 'true');

    let best: HTMLElement | null = null;
    let cur: HTMLElement | null = badge.parentElement;
    let depth = 0;
    while (cur && cur !== document.body && depth < 10) {
      const tag = cur.tagName.toLowerCase();
      if (cur.querySelector('a[href]') && cur.children.length >= 2) {
        if (['li', 'section', 'article', 'tr'].includes(tag)) { best = cur; break; }
        if (tag === 'div' && !best) best = cur;
      }
      cur = cur.parentElement;
      depth++;
    }
    if (!best) {
      let fb: HTMLElement | null = badge.parentElement;
      while (fb && fb !== document.body) {
        if (fb.hasAttribute('data-srcid')) { best = fb; break; }
        fb = fb.parentElement;
      }
    }
    if (best) {
      const r = best.getBoundingClientRect();
      const vpArea = window.innerWidth * window.innerHeight;
      if (r.width * r.height > vpArea * 0.6) best = null;
    }
    if (best && !best.hasAttribute('data-srb-ad-scanned')) {
      best.setAttribute('data-srb-ad-scanned', 'true');
      injectAdBadge(best, '');
    }
  });
}

// ========== Selector Rules ==========

export function restoreBlockedSelectors(): void {
  if (!_state.isEnabled) return;
  const curHost = _getHostname();
  _state.blockedSelectors.forEach((entry) => {
    const sep = entry.indexOf('||');
    if (sep === -1) return;
    if (entry.slice(0, sep) !== curHost) return;
    try {
      document.querySelectorAll(entry.slice(sep + 2)).forEach((el) => {
        el.querySelectorAll('.srb-mask, .srb-blocked-badge').forEach((b) => b.remove());
      });
    } catch { /* skip */ }
  });
}

export function applyBlockedSelectors(): void {
  if (!_state.isEnabled) return;
  const curHost = _getHostname();
  _state.blockedSelectors.forEach((entry) => {
    const sep = entry.indexOf('||');
    if (sep === -1) return;
    if (entry.slice(0, sep) !== curHost) return;
    const selector = entry.slice(sep + 2);
    try {
      document.querySelectorAll(selector).forEach((el) => {
        if (el.querySelector('.srb-mask, .srb-blocked-badge')) return;
        (el as HTMLElement).style.position = (el as HTMLElement).style.position || 'relative';
        const mask = document.createElement('div');
        mask.className = 'srb-mask';
        el.appendChild(mask);
        const badge = document.createElement('div');
        badge.className = 'srb-blocked-badge';
        badge.textContent = '已屏蔽';
        badge.title = '点击取消屏蔽';
        badge.setAttribute('data-entry', entry);
        badge.addEventListener('click', async () => {
          mask.remove();
          badge.remove();
          const fullEntry = badge.getAttribute('data-entry');
          if (fullEntry) {
            const idx = _state.blockedSelectors.indexOf(fullEntry);
            if (idx >= 0) await removeBlockedItem('selector', idx);
          }
        });
        el.appendChild(badge);
      });
    } catch { /* skip */ }
  });
}

export function checkSavedSelectors(): void {
  setTimeout(() => applyBlockedSelectors(), 500);
}

// ========== Cleanup ==========

export function clearAllMarkers(): void {
  document.querySelectorAll('.srb-mask, .srb-blocked-badge, .srb-ad-mask, .srb-ad-badge, .srb-block-btn, .srb-popup').forEach((el) => el.remove());
  document.querySelectorAll('[data-srb-processed], [data-srb-ad-scanned]').forEach((el) => {
    el.removeAttribute('data-srb-processed');
    el.removeAttribute('data-srb-ad-scanned');
  });
}

// Set by content.ts for container-missing fallback
let _onContainerMissing: () => void = () => {};

export function setOnContainerMissing(fn: () => void): void {
  _onContainerMissing = fn;
}
