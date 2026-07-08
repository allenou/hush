import type { SearchEngineConfig } from './search-engines';

/** 自动分析 DOM 中重复出现的结构模式，检测搜索结果列表 */
export function autoDetectSearchResults(getHostname: () => string): SearchEngineConfig | null {
  const config = detectByClassPattern(getHostname);
  if (config) {
    console.log('[SRB] Auto-detect success:', config.containerSelector, '>', config.itemSelector);
  }
  return config;
}

// ========== 核心检测：基于重复 class 模式 ==========

interface ClassPattern {
  key: string;
  count: number;
  sample: Element;
  linkCount: number;
  childTextLen: number;
}

function detectByClassPattern(getHostname: () => string): SearchEngineConfig | null {
  const patternMap = scanDomPatterns();
  if (patternMap.size === 0) { console.log('[SRB] No patterns found'); return null; }

  const candidates = scorePatterns(patternMap);
  if (candidates.length === 0) { console.log('[SRB] No scored candidates'); return null; }

  // 试 Top-5 候选，选第一个能生成有效配置的
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
  // 用 XPath 或 querySelectorAll 扫描，限制深度避免过慢
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
    // 取第一个样本的链接数和文本长度
    if (entry.count === 1) {
      entry.linkCount = el.querySelectorAll('a[href]').length;
      entry.childTextLen = Array.from(el.children).reduce((sum, c) => sum + (c.textContent?.length ?? 0), 0);
    }
    map.set(key, entry);
  }

  console.log('[SRB] Found', map.size, 'unique patterns');

  // Debug: 按出现次数排序，列出前 20
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
  for (const [, p] of map) {
    if (p.count < 3) { filteredCount++; continue; }
    if (p.linkCount === 0) { filteredNoLinks++; continue; }

    const cls = (p.sample.className as string).toLowerCase();

    // 排除导航/工具条类元素
    const blockWords = ['nav', 'menu', 'header', 'overflow', 'toolbar',
      'breadcrumb', 'pagination', 'sidebar', 'toplist', 'advert', 'sponsor', 'rank'];
    for (const w of blockWords) { if (cls.includes(w)) { filteredExclude++; continue outer; } }

    // 排除在 nav/header/footer 内的元素
    let parent = p.sample.parentElement;
    while (parent && parent !== document.body) {
      const pt = parent.tagName.toLowerCase();
      const pc = (parent.className as string).toLowerCase();
      if (pt === 'nav' || pt === 'header' || pt === 'footer') { filteredExclude++; continue outer; }
      for (const w of blockWords) {
        if (pc.includes(w)) {
          console.log('[SRB] Excluded by parent:', p.key, 'parent has "' + w + '" in class "' + pc + '"');
          filteredExclude++; continue outer;
        }
      }
      parent = parent.parentElement;
    }

    // === 评分策略 ===
    let score = 0;

    // 1. 出现次数（降低权重，避免 UI 元素碾压）
    score += Math.min(p.count, 30) * 10; // 上限 300 分

    // 2. 每个链接含文本内容越多越像搜索结果（而非图标/标签）
    score += p.linkCount * 12;

    // 3. class 关键词加分（通用搜索结果特征）
    const resultHints = ['result', 'hit', 'search', 'algo', 'card', 'entry', 'listing', 'list-item'];
    for (const hint of resultHints) {
      if (cls.includes(hint)) { score += 150; break; }
    }
    // 额外：res- / res_ 前缀也加分（如 res-list, res-item, res_list）
    if (/^res[-_]/.test(cls) || cls.includes('-res-') || cls.includes('_res-')) score += 100;

    // 4. 减分：UI 类关键词（ellipsis, tag, nav 等非结果特征）
    const uiWords = ['ellipsis', '-tag', 'spread', 'advert'];
    for (const w of uiWords) { if (cls.includes(w)) score -= 150; }

    // 5. 链接数过多（>5）说明可能是广告容器而非搜索结果项
    if (p.linkCount > 5) score -= 100 * Math.floor(p.linkCount / 5);
    if (p.linkCount === 1 && p.count > 15) score -= 30; // 只有 1 个链接且大量重复 → UI 元素

    // 6. 链接文本和描述文本越长越像搜索结果
    if (p.childTextLen > 60) score += 30;

    // 6. 减分：class 含随机 hash（如 _1MWDu, _2X7ZC）
    const hashes = cls.match(/_[a-zA-Z0-9]{5,}/g);
    if (hashes) score -= 15 * hashes.length;

    // 7. 减分：class 太短（div.a x3 这种一般是图标或简单的列表）
    if (cls.split(/\s+/).length <= 2 && p.count >= 20) score -= 100;

    // 8. 区域加分
    let pc = p.sample.parentElement;
    let inSidebar = false;
    while (pc && pc !== document.body) {
      const pcls = (pc.className as string).toLowerCase();
      if (pcls.includes('content_left')) score += 150;
      if (pcls.includes('content_right') || pcls.includes('sidebar') || pcls.includes('aside') || pcls.includes('secondary')) {
        score -= 200;
        inSidebar = true;
      }
      pc = pc.parentElement;
    }
    // 不在侧边栏也不算在 header/footer → 默认给个小加分
    if (!inSidebar) score += 20;

    // 9. 页面位置加分：搜索结果通常在页面中间区域
    const rect = p.sample.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpCx = vpW / 2;
    const elCx = rect.left + rect.width / 2;
    const distFromCenter = Math.abs(elCx - vpCx) / vpW;
    if (distFromCenter < 0.15) score += 80;
    else if (distFromCenter < 0.3) score += 30;
    else score -= 60;

    result.push(p);
    // 保留评分信息用于排序
    (p as any).__score = score;
  }

  console.log('[SRB] Filter: total=' + map.size + ' count<3=' + filteredCount + ' noLinks=' + filteredNoLinks + ' excluded=' + filteredExclude + ' passed=' + result.length);
  if (result.length === 0) {
    // 把 count>=3 && links>0 的被排除项打印出来
    for (const [, p] of map) {
      if (p.count >= 3 && p.linkCount > 0) {
        console.log('[SRB] Excluded candidate:', p.key, 'x' + p.count, 'links:', p.linkCount);
      }
    }
  }

  result.sort((a, b) => ((b as any).__score ?? 0) - ((a as any).__score ?? 0));

  console.log('[SRB] Top candidates:');
  result.slice(0, 5).forEach((p) => console.log('  ', p.key, 'score:', (p as any).__score, 'x' + p.count, 'links:', p.linkCount, 'el:', p.sample));

  return result;
}

/** 从最佳候选生成配置 */
function buildConfig(candidate: ClassPattern, getHostname: () => string): SearchEngineConfig | null {
  const { sample: el, count } = candidate;

  // 找到包含所有同类型元素的容器
  let container = el.parentElement;
  while (container && container !== document.body) {
    const similar = Array.from(container.children).filter(
      (c) => c.tagName === el.tagName && (c.className as string) === (el.className as string),
    );
    if (similar.length >= count * 0.6) break;
    container = container.parentElement;
  }
  if (!container || container === document.body) container = el.parentElement;
  if (!container) return null;

  const tag = el.tagName.toLowerCase();
  const cls = (el.className as string).trim();
  const itemSelector = cls ? cls.split(/\s+/).map((c) => '.' + CSS.escape(c)).join('') : tag;

  // 生成容器选择器（尽量简短，优先用 id）
  const parts: string[] = [];
  let cur: Element | null = container;

  // 如果能用 id 精确定位，只用 id
  if (container.id) {
    // 但 id 太长或有特殊字符时也用路径
    const escapedId = CSS.escape(container.id);
    if (container.id.length < 30 && !container.id.includes('\\')) {
      parts.push(container.tagName.toLowerCase() + '#' + escapedId);
    } else {
      cur = container;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const t = cur.tagName.toLowerCase();
        const id = cur.id ? '#' + CSS.escape(cur.id) : '';
        const c2 = Array.from(cur.classList).slice(0, 2).map((cl) => '.' + CSS.escape(cl)).join('');
        parts.unshift(t + id + c2);
        cur = cur.parentElement;
        if (parts.length >= 3) break;
      }
    }
  } else {
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const t = cur.tagName.toLowerCase();
      const id = cur.id ? '#' + CSS.escape(cur.id) : '';
      const c2 = Array.from(cur.classList).slice(0, 2).map((cl) => '.' + CSS.escape(cl)).join('');
      parts.unshift(t + id + c2);
      cur = cur.parentElement;
      if (cur?.id || parts.length >= 4) break;
    }
  }

  // 如果生成的选择器太长，回退到只用父标签
  const fullSelector = parts.join(' ');
  if (fullSelector.length > 80) {
    const fallback = container.tagName.toLowerCase() + itemSelector;
    const fallbackEl = document.querySelector(fallback);
    if (fallbackEl && fallbackEl.querySelectorAll(itemSelector).length >= 2) {
      return {
        name: getHostname(),
        hostname: getHostname(),
        containerSelector: container.tagName.toLowerCase(),
        itemSelector,
        linkSelector: 'a[href]',
      };
    }
  }

  return {
    name: getHostname(),
    hostname: getHostname(),
    containerSelector: parts.join(' ') || 'body',
    itemSelector,
    linkSelector: 'a[href]',
  };
}

/** 验证配置：容器能找到、有 2+ 匹配项、且多数项含有效链接 */
function validateConfig(config: SearchEngineConfig): boolean {
  const containerEl = document.querySelector(config.containerSelector);
  if (!containerEl) { console.log('[SRB] Config invalid: container not found'); return false; }
  const items = containerEl.querySelectorAll(config.itemSelector);
  if (items.length < 2) { console.log('[SRB] Config invalid: only', items.length, 'items'); return false; }

  // 验证多数项含有效链接（非空 href）
  let validCount = 0;
  items.forEach((item) => {
    const link = item.querySelector<HTMLAnchorElement>(config.linkSelector);
    if (link?.href && !link.href.startsWith('javascript:')) validCount++;
  });
  if (validCount < Math.max(2, items.length / 2)) {
    console.log('[SRB] Config invalid: only', validCount, 'of', items.length, 'have valid links');
    return false;
  }

  console.log('[SRB] Config valid:', items.length, 'items,', validCount, 'with links');
  return true;
}
