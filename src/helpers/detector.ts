import type { SearchEngineConfig } from './search-engines';
import { buildPathnamePattern, normalizeHostname } from './search-engines';

export const AUTO_DETECT_PERSISTENCE_CONFIDENCE = 85;

export interface DetectedSearchEngineConfig extends SearchEngineConfig {
  confidence: number;
  itemCount: number;
}

export function shouldPersistAutoDetectedEngine(config: Pick<DetectedSearchEngineConfig, 'confidence'>): boolean {
  return config.confidence >= AUTO_DETECT_PERSISTENCE_CONFIDENCE;
}

/** 自动分析 DOM 中重复出现的结构模式，检测搜索结果列表 */
export function autoDetectSearchResults(getHostname: () => string): DetectedSearchEngineConfig | null {
  const config = detectByClassPattern(getHostname);
  if (config) {
    console.log('[SRB] Auto-detect success:', config.containerSelector, '>', config.itemSelector, 'confidence:', config.confidence);
  }
  return config;
}

interface ClassPattern {
  key: string;
  count: number;
  sample: Element;
  linkCount: number;
  childTextLen: number;
  score?: number;
}

interface LinkQualityStats {
  validCount: number;
  richLinkCount: number;
  longTextCount: number;
}

function detectByClassPattern(getHostname: () => string): DetectedSearchEngineConfig | null {
  const patternMap = scanDomPatterns();
  if (patternMap.size === 0) { console.log('[SRB] No patterns found'); return null; }

  const candidates = scorePatterns(patternMap);
  if (candidates.length === 0) { console.log('[SRB] No scored candidates'); return null; }

  for (const candidate of candidates.slice(0, 5)) {
    const config = buildConfig(candidate, getHostname);
    if (config && validateConfig(config)) {
      return config;
    }
  }
  return null;
}

/** 扫描 DOM，收集所有带 class 的重复元素模式 */
function scanDomPatterns(): Map<string, ClassPattern> {
  const map = new Map<string, ClassPattern>();
  const all = document.querySelectorAll('li, div, tr, section, article, dl, ol, .result, [class*="result"], [class*="item"], [class*="hit"]');
  console.log('[SRB] Scanning', all.length, 'candidate elements');

  for (const el of all) {
    if (el.children.length === 0) continue;
    const tag = el.tagName.toLowerCase();
    const cls = (el.className as string).toString().trim();
    if (!cls) continue;

    const key = tag + '.' + cls.split(/\s+/).sort().join('.');
    const entry = map.get(key) || {
      key, count: 0, sample: el, linkCount: 0, childTextLen: 0,
    };
    entry.count++;
    if (entry.count === 1) {
      entry.linkCount = getMeaningfulLinks(el).length;
      entry.childTextLen = getNodeTextLength(el);
    }
    map.set(key, entry);
  }

  console.log('[SRB] Found', map.size, 'unique patterns');

  const byCount = Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  console.log('[SRB] Top 20 by count:');
  byCount.slice(0, 20).forEach(([key, p]) => {
    console.log('  ' + key + ' x' + p.count + ' links:' + p.linkCount + ' textLen:' + p.childTextLen);
  });

  return map;
}

/** 给候选模式评分，返回按分降序的 Top10 */
function scorePatterns(map: Map<string, ClassPattern>): ClassPattern[] {
  const result: ClassPattern[] = [];
  let filteredCount = 0, filteredNoLinks = 0, filteredExclude = 0;

  outer:
  for (const [, pattern] of map) {
    if (pattern.count < 4) { filteredCount++; continue; }
    if (pattern.linkCount === 0) { filteredNoLinks++; continue; }
    if (isExcludedPattern(pattern.sample)) { filteredExclude++; continue; }

    pattern.score = scorePatternCandidate(pattern);
    if (pattern.score <= 0) continue;
    result.push(pattern);
  }

  console.log('[SRB] Filter: total=' + map.size + ' count<4=' + filteredCount + ' noLinks=' + filteredNoLinks + ' excluded=' + filteredExclude + ' passed=' + result.length);
  if (result.length === 0) {
    for (const [, p] of map) {
      if (p.count >= 4 && p.linkCount > 0) {
        console.log('[SRB] Excluded candidate:', p.key, 'x' + p.count, 'links:', p.linkCount);
      }
    }
  }

  result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  console.log('[SRB] Top candidates:');
  result.slice(0, 5).forEach((p) => console.log('  ', p.key, 'score:', p.score, 'x' + p.count, 'links:', p.linkCount, 'el:', p.sample));

  return result;
}

function scorePatternCandidate(pattern: ClassPattern): number {
  const sample = pattern.sample;
  const cls = (sample.className as string).toLowerCase();
  const rect = sample.getBoundingClientRect();
  const textLength = Math.max(pattern.childTextLen, getNodeTextLength(sample));
  const links = getMeaningfulLinks(sample);

  let score = 0;

  score += Math.min(pattern.count, 12) * 8;
  score += Math.min(textLength, 240) / 3;

  if (links.length >= 1 && links.length <= 3) score += 80;
  else if (links.length > 6) score -= 140;

  const resultHints = ['result', 'results', 'search', 'algo', 'entry', 'listing', 'article', 'content', 'item'];
  if (resultHints.some((hint) => cls.includes(hint))) score += 120;
  if (/^res[-_]/.test(cls) || cls.includes('-res-') || cls.includes('_res_')) score += 80;

  const badHints = ['related', 'recommend', 'suggest', 'widget', 'module', 'toolbar', 'menu', 'hot', 'rank', 'nav', 'footer', 'header'];
  if (badHints.some((hint) => cls.includes(hint))) score -= 220;

  if (hasUnstableClassToken(cls)) score -= 40;
  if (cls.split(/\s+/).length <= 2 && pattern.count >= 20) score -= 60;

  score += scoreByLayout(rect);
  score += scoreByAncestors(sample);

  const parent = sample.parentElement;
  if (parent) {
    const siblingMatches = Array.from(parent.children).filter(
      (child) => child.tagName === sample.tagName && child.className === sample.className,
    ).length;
    if (siblingMatches >= Math.max(4, Math.floor(pattern.count * 0.5))) score += 70;
  }

  return score;
}

/** 从最佳候选生成配置 */
function buildConfig(candidate: ClassPattern, getHostname: () => string): DetectedSearchEngineConfig | null {
  const el = candidate.sample;
  const itemSelector = buildStableItemSelector(el);
  if (!itemSelector) return null;

  const container = findBestContainer(el, candidate.count);
  if (!container) return null;

  const containerSelector = buildStableContainerSelector(container, itemSelector);
  if (!containerSelector) return null;

  const containerEl = document.querySelector(containerSelector);
  const itemCount = containerEl?.querySelectorAll(itemSelector).length ?? 0;
  if (!containerEl || itemCount < 4 || itemCount > 80) {
    console.log('[SRB] Config build rejected:', containerSelector, itemSelector, 'count=', itemCount);
    return null;
  }

  return {
    name: normalizeHostname(getHostname()),
    hostname: normalizeHostname(getHostname()),
    pathnamePattern: buildPathnamePattern(window.location.pathname),
    containerSelector,
    itemSelector,
    linkSelector: 'a[href]',
    confidence: calculateDetectionConfidence(candidate, itemCount),
    itemCount,
  };
}

function calculateDetectionConfidence(candidate: ClassPattern, itemCount: number): number {
  const score = Math.max(candidate.score ?? 0, 0);
  const scoreConfidence = Math.min(75, score / 5);
  const countConfidence = Math.min(25, itemCount * 2);
  return Math.min(100, Math.round(scoreConfidence + countConfidence));
}

/** 验证配置：容器能找到、列表像主结果区、且多数项含有效链接 */
function validateConfig(config: SearchEngineConfig): boolean {
  const containerEl = document.querySelector(config.containerSelector);
  if (!containerEl) { console.log('[SRB] Config invalid: container not found'); return false; }

  const items = Array.from(containerEl.querySelectorAll(config.itemSelector));
  if (items.length < 4) { console.log('[SRB] Config invalid: only', items.length, 'items'); return false; }

  const rects = items
    .map((item) => item.getBoundingClientRect())
    .filter((rect) => rect.width > 120 && rect.height > 24);
  if (rects.length < 4) { console.log('[SRB] Config invalid: not enough visible items'); return false; }

  if (!isMainColumn(containerEl.getBoundingClientRect())) {
    console.log('[SRB] Config invalid: container not in main column');
    return false;
  }

  if (!isMostlyVerticalList(rects)) {
    console.log('[SRB] Config invalid: items are not vertically aligned');
    return false;
  }

  if (!hasConsistentWidths(rects)) {
    console.log('[SRB] Config invalid: item widths are inconsistent');
    return false;
  }

  const linkStats = getLinkQualityStats(items, config.linkSelector);
  if (linkStats.validCount < Math.max(4, Math.floor(items.length * 0.7))) {
    console.log('[SRB] Config invalid: only', linkStats.validCount, 'of', items.length, 'have valid links');
    return false;
  }
  if (linkStats.richLinkCount < Math.max(3, Math.floor(items.length * 0.5))) {
    console.log('[SRB] Config invalid: rich links too few', linkStats.richLinkCount, '/', items.length);
    return false;
  }
  if (linkStats.longTextCount < Math.max(3, Math.floor(items.length * 0.5))) {
    console.log('[SRB] Config invalid: text too short', linkStats.longTextCount, '/', items.length);
    return false;
  }

  console.log('[SRB] Config valid:', items.length, 'items,', linkStats.validCount, 'with links');
  return true;
}

function findBestContainer(el: Element, expectedCount: number): Element | null {
  let best: Element | null = null;
  let bestScore = -1;
  let cur = el.parentElement;

  while (cur && cur !== document.body && cur !== document.documentElement) {
    const siblings = Array.from(cur.children).filter(
      (child) => child.tagName === el.tagName && child.className === el.className,
    ).length;
    const itemCount = cur.querySelectorAll(buildStableItemSelector(el) ?? el.tagName.toLowerCase()).length;
    let score = 0;
    if (siblings >= Math.max(3, Math.floor(expectedCount * 0.5))) score += 100;
    if (itemCount >= 4 && itemCount <= 60) score += 80;
    if (cur.id) score += 40;
    score += scoreByLayout(cur.getBoundingClientRect());
    score += scoreByAncestors(cur);
    if (score > bestScore) {
      best = cur;
      bestScore = score;
    }
    cur = cur.parentElement;
  }

  return best ?? el.parentElement;
}

function buildStableItemSelector(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  const stableClasses = getStableClasses(el);

  const candidates = [
    stableClasses.slice(0, 2),
    stableClasses.slice(0, 1),
    [],
  ];

  for (const classes of candidates) {
    const selector = classes.length > 0
      ? tag + classes.map((cls) => '.' + CSS.escape(cls)).join('')
      : tag;
    const count = document.querySelectorAll(selector).length;
    if (count >= 4 && count <= 120) return selector;
  }

  return null;
}

function buildStableContainerSelector(container: Element, itemSelector: string): string | null {
  const candidates: string[] = [];
  const tag = container.tagName.toLowerCase();

  if (container.id && isStableId(container.id)) {
    candidates.push('#' + CSS.escape(container.id));
    candidates.push(tag + '#' + CSS.escape(container.id));
  }

  const stableClasses = getStableClasses(container);
  if (stableClasses.length > 0) {
    candidates.push(tag + stableClasses.slice(0, 2).map((cls) => '.' + CSS.escape(cls)).join(''));
    candidates.push(tag + '.' + CSS.escape(stableClasses[0]));
  }

  const pathSelector = buildShortPathSelector(container);
  if (pathSelector) candidates.push(pathSelector);
  candidates.push(tag);

  for (const selector of dedupe(candidates)) {
    if (selector.length > 90) continue;
    const found = document.querySelector(selector);
    const count = found?.querySelectorAll(itemSelector).length ?? 0;
    if (found && count >= 4 && count <= 80 && isMainColumn(found.getBoundingClientRect())) {
      return selector;
    }
  }

  return null;
}

function buildShortPathSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;

  while (cur && cur !== document.body && cur !== document.documentElement && parts.length < 4) {
    const tag = cur.tagName.toLowerCase();
    if (cur.id && isStableId(cur.id)) {
      parts.unshift('#' + CSS.escape(cur.id));
      break;
    }
    const stableClasses = getStableClasses(cur);
    const cls = stableClasses.length > 0
      ? '.' + CSS.escape(stableClasses[0])
      : '';
    parts.unshift(tag + cls);
    cur = cur.parentElement;
  }

  return parts.join(' > ');
}

function getStableClasses(el: Element): string[] {
  return Array.from(el.classList)
    .filter((cls) => cls.length > 2)
    .filter((cls) => !hasUnstableClassToken(cls))
    .filter((cls) => !/^(active|selected|hover|focus|open|close|show|hide)$/i.test(cls))
    .slice(0, 3);
}

function hasUnstableClassToken(value: string): boolean {
  return /(^|[_-])[a-z0-9]{8,}([_-]|$)/i.test(value) || /^css-/.test(value) || /^_/.test(value);
}

function isStableId(id: string): boolean {
  return id.length <= 32 && !hasUnstableClassToken(id);
}

function getMeaningfulLinks(el: Element): HTMLAnchorElement[] {
  return Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter((link) => isMeaningfulHref(link.href))
    .filter((link) => (link.textContent ?? '').trim().length >= 6);
}

function isMeaningfulHref(href: string): boolean {
  return Boolean(href)
    && !href.startsWith('javascript:')
    && !href.startsWith('#')
    && !href.startsWith('about:blank');
}

function getNodeTextLength(el: Element): number {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().length;
}

function isExcludedPattern(sample: Element): boolean {
  const blockWords = ['nav', 'menu', 'header', 'overflow', 'toolbar', 'breadcrumb', 'pagination', 'sidebar', 'toplist', 'advert', 'sponsor', 'rank', 'related', 'recommend', 'suggest', 'widget', 'module', 'panel'];
  const cls = (sample.className as string).toLowerCase();
  if (blockWords.some((word) => cls.includes(word))) return true;

  let parent = sample.parentElement;
  while (parent && parent !== document.body) {
    const tag = parent.tagName.toLowerCase();
    const parentCls = (parent.className as string).toLowerCase();
    if (tag === 'nav' || tag === 'header' || tag === 'footer' || tag === 'aside') return true;
    if (blockWords.some((word) => parentCls.includes(word))) return true;
    parent = parent.parentElement;
  }

  return false;
}

function scoreByLayout(rect: DOMRect): number {
  const vpW = Math.max(window.innerWidth, 1);
  const vpH = Math.max(window.innerHeight, 1);
  const centerX = rect.left + rect.width / 2;
  const normalizedDistance = Math.abs(centerX - vpW / 2) / vpW;
  let score = 0;

  if (normalizedDistance < 0.12) score += 80;
  else if (normalizedDistance < 0.22) score += 35;
  else if (centerX > vpW * 0.72) score -= 120;

  if (rect.width > vpW * 0.35) score += 50;
  if (rect.width > vpW * 0.6) score += 30;
  if (rect.height > 40 && rect.height < vpH * 0.4) score += 20;

  return score;
}

function scoreByAncestors(el: Element): number {
  let score = 0;
  let cur = el.parentElement;

  while (cur && cur !== document.body) {
    const cls = (cur.className as string).toLowerCase();
    if (cls.includes('content') || cls.includes('main') || cls.includes('result')) score += 40;
    if (cls.includes('content_left')) score += 90;
    if (cls.includes('content_right') || cls.includes('sidebar') || cls.includes('secondary') || cls.includes('aside')) score -= 160;
    cur = cur.parentElement;
  }

  return score;
}

function isMainColumn(rect: DOMRect): boolean {
  const vpW = Math.max(window.innerWidth, 1);
  const centerX = rect.left + rect.width / 2;
  return rect.width >= vpW * 0.28 && centerX <= vpW * 0.72;
}

function isMostlyVerticalList(rects: DOMRect[]): boolean {
  let aligned = 0;
  for (let i = 1; i < rects.length; i++) {
    const prev = rects[i - 1];
    const cur = rects[i];
    if (cur.top >= prev.top && Math.abs(cur.left - prev.left) <= Math.max(48, prev.width * 0.15)) {
      aligned++;
    }
  }
  return aligned >= Math.max(3, Math.floor((rects.length - 1) * 0.7));
}

function hasConsistentWidths(rects: DOMRect[]): boolean {
  const widths = rects.map((rect) => rect.width).sort((a, b) => a - b);
  const median = widths[Math.floor(widths.length / 2)] ?? 0;
  if (median <= 0) return false;
  const consistent = widths.filter((width) => width >= median * 0.7 && width <= median * 1.3).length;
  return consistent >= Math.max(3, Math.floor(widths.length * 0.7));
}

function getLinkQualityStats(items: Element[], linkSelector: string): LinkQualityStats {
  let validCount = 0;
  let richLinkCount = 0;
  let longTextCount = 0;

  for (const item of items) {
    const links = Array.from(item.querySelectorAll<HTMLAnchorElement>(linkSelector))
      .filter((link) => isMeaningfulHref(link.href));
    const mainLink = links.find((link) => (link.textContent ?? '').trim().length >= 6);
    if (mainLink) {
      validCount++;
      if ((mainLink.textContent ?? '').trim().length >= 10) richLinkCount++;
    }
    if (getNodeTextLength(item) >= 30) longTextCount++;
  }

  return { validCount, richLinkCount, longTextCount };
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
