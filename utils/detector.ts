import type { SearchEngineConfig } from './search-engines';

interface Pattern {
  key: string;
  count: number;
  el: Element;
  linkCount: number;
}

/** 自动分析 DOM 中重复出现的 class 模式，检测搜索结果列表 */
export function autoDetectSearchResults(getHostname: () => string): SearchEngineConfig | null {
  const patternCount = new Map<string, { count: number; sample: Element }>();
  const all = document.querySelectorAll('*');
  console.log('[SRB] Auto-detect scanning', all.length, 'elements');

  for (const el of all) {
    if (el.children.length === 0) continue;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'br', 'hr'].includes(tag)) continue;
    const cls = (el.className as string).toString().trim();
    if (!cls) continue;
    const key = tag + '.' + cls.split(/\s+/).sort().join('.');
    const entry = patternCount.get(key) || { count: 0, sample: el };
    entry.count++;
    patternCount.set(key, entry);
  }
  console.log('[SRB] Found', patternCount.size, 'unique patterns');

  // 列出所有出现 2 次以上的模式
  const candidates = Array.from(patternCount.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);
  console.log('[SRB] Patterns with count>=2:', candidates.length);
  candidates.slice(0, 20).forEach(([key, { count, sample: el }]) => {
    const links = el.querySelectorAll('a[href]').length;
    console.log(`  ${key} x${count} links:${links}`, el.children.length > 0 ? el : '');
  });

  // 评分选最优
  interface Score extends Pattern { score: number }
  const scored: Score[] = [];
  outer:
  for (const [key, { count, sample: el }] of patternCount) {
    if (count < 3) continue;
    const links = el.querySelectorAll('a[href]');
    if (links.length === 0) continue;

    const cls = (el.className as string).toLowerCase();
    const excludeWords = ['nav', 'menu', 'header', 'footer', 'overflow', 'toolbar', 'tab', 'breadcrumb', 'pagination', 'sidebar', 'toplist'];
    for (const word of excludeWords) {
      if (cls.includes(word)) continue outer;
    }

    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const ptag = parent.tagName.toLowerCase();
      const pcls = (parent.className as string).toLowerCase();
      if (ptag === 'nav' || ptag === 'header' || ptag === 'footer') continue outer;
      if (['nav', 'menu', 'header', 'footer', 'sidebar', 'aside', 'right', 'cr-offset'].some((w) => pcls.includes(w))) continue outer;
      parent = parent.parentElement;
    }

    let score = count * 10 + links.length * 5;

    // 关键加分：class 含 result / c-container / xpath-log 等搜索结果特征
    if (/\b(result|c-container|xpath-log)\b/.test(cls)) score += 500;

    // 加分：含 search / item / algo
    if (/\b(search|item|algo)\b/.test(cls)) score += 50;

    // 减分：class 含 hash 随机字符（如 _1MWDu）
    const hashMatch = cls.match(/_[a-zA-Z0-9]{5,}/);
    if (hashMatch) score -= 20 * hashMatch.length;

    // 父区域检查
    let pc = el.parentElement;
    let inLeft = false, inRight = false;
    while (pc && pc !== document.body) {
      const pcls = (pc.className as string).toLowerCase();
      if (pcls.includes('content_left')) inLeft = true;
      if (pcls.includes('content_right') || pcls.includes('cr-offset')) inRight = true;
      pc = pc.parentElement;
    }
    if (inLeft) score += 200;
    if (inRight) score -= 500;

    scored.push({ key, score, count, el, linkCount: links.length });
  }

  if (scored.length === 0) { console.log('[SRB] No suitable pattern found'); return null; }

  scored.sort((a, b) => b.score - a.score);
  console.log('[SRB] Top 3 candidates:');
  scored.slice(0, 3).forEach((c) => console.log('  ', c.key, 'score:', c.score, 'count:', c.count, 'links:', c.linkCount, 'el:', c.el));

  const best = scored[0];
  console.log('[SRB] Best pattern:', best.key, 'score:', best.score, 'count:', best.count, 'links:', best.linkCount);

  // 生成容器选择器
  const { el, count } = best;
  let container = el.parentElement;
  while (container && container !== document.body) {
    const similar = Array.from(container.children).filter(
      (c) => c.tagName === el.tagName && (c.className as string) === (el.className as string),
    );
    if (similar.length >= count) break;
    container = container.parentElement;
  }
  if (!container || container === document.body) container = el.parentElement;

  const tag = el.tagName.toLowerCase();
  const cls = (el.className as string).trim();
  const itemSelector = cls ? cls.split(/\s+/).map((c) => '.' + CSS.escape(c)).join('') : tag;

  const parts: string[] = [];
  let cur: Element | null = container;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const t = cur.tagName.toLowerCase();
    const id = cur.id ? '#' + CSS.escape(cur.id) : '';
    const c2 = Array.from(cur.classList).slice(0, 2).map((cl) => '.' + CSS.escape(cl)).join('');
    parts.unshift(t + id + c2);
    cur = cur.parentElement;
  }

  return {
    name: getHostname(),
    hostname: getHostname(),
    containerSelector: parts.join(' ') || 'body',
    itemSelector,
    linkSelector: 'a[href]',
  };
}
