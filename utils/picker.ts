import { addBlockedSelector, removeBlockedSelector, recordBlock, get } from './storage';

// ========== Module State ==========

let active = false;
let highlight: HTMLDivElement | null = null;
let tooltip: HTMLDivElement | null = null;
let handlers: {
  onMove: ((e: MouseEvent) => void) | null;
  onClick: ((e: MouseEvent) => void) | null;
  onKey: ((e: KeyboardEvent) => void) | null;
} | null = null;

// ========== Selector Generation ==========

/** 为元素生成稳定的 CSS 选择器 */
function generateSelector(el: Element): string {
  if (el.id && !/^[a-z]*[0-9a-f]{8,}/i.test(el.id)) {
    return '#' + CSS.escape(el.id);
  }
  const stableClasses = Array.from(el.classList)
    .filter((c) => !/^[a-z]*[0-9a-f]{5,}/i.test(c) && !/^_/.test(c) && !/^css-/.test(c) && c.length > 2)
    .slice(0, 2);
  if (stableClasses.length > 0) {
    const base = el.tagName.toLowerCase() + '.' + stableClasses.map((c) => CSS.escape(c)).join('.');
    // 加上 nth-child 避免命中同 class 的所有元素
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const idx = siblings.indexOf(el) + 1;
      return base + ':nth-child(' + idx + ')';
    }
    return base;
  }
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const parent = cur.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children);
    if (siblings.length === 1) {
      parts.unshift(cur.tagName.toLowerCase());
    } else {
      const idx = siblings.indexOf(cur) + 1;
      parts.unshift(cur.tagName.toLowerCase() + ':nth-child(' + idx + ')');
    }
    cur = parent;
    if ((cur as HTMLElement).id && !/^[a-z]*[0-9a-f]{8,}/i.test((cur as HTMLElement).id)) {
      parts.unshift('#' + CSS.escape((cur as HTMLElement).id));
      break;
    }
    if (parts.length > 4) break;
  }
  return parts.join(' > ');
}

// ========== Block Target Detection ==========

/** 从最里层向上找合适的"块"元素，优先 display:block/flex/grid 和全宽元素 */
function findBlockTarget(el: Element): Element | null {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const tooLarge = vpW * vpH * 0.45;

  let best: Element | null = null;
  let bestScore = 0;
  let cur: Element | null = el;
  let depth = 0;

  while (cur && cur !== document.body && cur !== document.documentElement && depth < 8) {
    const rect = cur.getBoundingClientRect();
    const area = rect.width * rect.height;
    const tag = cur.tagName.toLowerCase();
    const children = cur.children.length;
    const hasLink = cur.querySelector('a[href]');

    if (area > tooLarge) { /* 太大就停下来，但已找到的 best 仍可用 */ break; }
    if (area < 8000 || children < 2 || !hasLink) {
      cur = cur.parentElement;
      depth++;
      continue;
    }
    if (!['div', 'li', 'article', 'section', 'tr', 'ul', 'ol'].includes(tag)) {
      cur = cur.parentElement;
      depth++;
      continue;
    }

    // 超过视口 25% 的元素太大，不可能是独立区块
    if (area > vpW * vpH * 0.25) { cur = cur.parentElement; if (depth === 0) best = null; depth++; continue; }

    // 评分：分越高越像可屏蔽的内容块
    let score = 1;
    const style = window.getComputedStyle(cur);
    const display = style.display;
    if (display === 'block' || display === 'flex' || display === 'grid') score += 3;

    // 全宽加分：宽度接近父容器或视口
    const parentW = cur.parentElement?.clientWidth ?? vpW;
    if (parentW > 0 && rect.width / parentW > 0.85) score += 2;
    if (rect.width > vpW * 0.5) score += 1;

    // 有 margin 说明是独立区块
    const mt = parseFloat(style.marginTop);
    const mb = parseFloat(style.marginBottom);
    if (mt > 4 || mb > 4) score += 1;

    if (score > bestScore) { best = cur; bestScore = score; }

    cur = cur.parentElement;
    depth++;
  }
  return best;
}

// ========== Undo Toast ==========

function showUndoToast(fullEntry: string, el: Element): void {
  const toast = document.createElement('div');
  toast.className = 'srb-undo-toast';
  toast.innerHTML = '已屏蔽该元素 <button class="srb-undo-btn">撤销</button>';
  document.body.appendChild(toast);

  const timer = setTimeout(() => toast.remove(), 5000);

  toast.querySelector('.srb-undo-btn')?.addEventListener('click', async () => {
    clearTimeout(timer);
    (el as HTMLElement).style.display = '';
    const { blockedSelectors: bs } = await get();
    const idx = bs.indexOf(fullEntry);
    if (idx >= 0) await removeBlockedSelector(idx);
    toast.remove();
  });
}

// ========== Confirm Dialog ==========

function showPickerConfirm(el: Element, selector: string, currentHost: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'srb-picker-confirm-overlay';

  const preview = (el.textContent ?? '').trim().slice(0, 120);
  const escSelector = selector.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escPreview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  overlay.innerHTML =
    '<div class="srb-picker-confirm-box">' +
    '<div class="srb-picker-confirm-title">屏蔽此元素</div>' +
    '<div style="margin-bottom:8px;color:#666;">域名：<code class="srb-picker-confirm-code">' + currentHost + '</code></div>' +
    '<div style="margin-bottom:8px;color:#666;">选择器：<code class="srb-picker-confirm-code" style="word-break:break-all;">' + escSelector + '</code></div>' +
    '<div style="margin-bottom:16px;color:#666;">内容预览：<span style="color:#333;">' + escPreview + '</span></div>' +
    '<div class="srb-picker-confirm-actions">' +
    '<button class="srb-picker-cancel">取消</button>' +
    '<button class="srb-picker-ok">屏蔽</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('.srb-picker-ok')?.addEventListener('click', async () => {
    try {
      const full = currentHost + '||' + selector;
      (el as HTMLElement).style.display = 'none';
      await addBlockedSelector(full);
      await recordBlock();
      showUndoToast(full, el);
      overlay.remove();
    } catch (err) {
      console.error('[SRB] Failed to block by selector:', err);
      overlay.remove();
    }
  });

  overlay.querySelector('.srb-picker-cancel')?.addEventListener('click', () => overlay.remove());
}

// ========== Public API ==========

export function isPickerActive(): boolean {
  return active;
}

export function deactivatePicker(): void {
  active = false;
  document.body.classList.remove('srb-picker-active');
  document.body.style.cursor = '';
  highlight?.remove();
  highlight = null;
  tooltip?.remove();
  tooltip = null;
  if (handlers) {
    if (handlers.onMove) document.removeEventListener('mousemove', handlers.onMove, true);
    if (handlers.onClick) document.removeEventListener('click', handlers.onClick, true);
    if (handlers.onKey) document.removeEventListener('keydown', handlers.onKey);
    handlers = null;
  }
}

export function activatePicker(getHostnameFn: () => string): void {
  if (active) deactivatePicker();
  active = true;
  document.body.classList.add('srb-picker-active');
  document.body.style.cursor = 'crosshair';

  tooltip = document.createElement('div');
  tooltip.className = 'srb-picker-tooltip';
  tooltip.textContent = '点击页面元素选择要屏蔽的内容 · Esc 退出';
  document.body.appendChild(tooltip);

  highlight = document.createElement('div');
  highlight.className = 'srb-picker-highlight';
  document.body.appendChild(highlight);

  const onMove = (e: MouseEvent) => {
    if (!active || !highlight) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) {
      highlight.style.display = 'none';
      document.body.style.cursor = 'not-allowed';
      return;
    }
    const target = findBlockTarget(el);
    if (!target || target.closest('#srb-float-btn, #srb-float-popup, .srb-picker-confirm-overlay, .srb-undo-toast')) {
      highlight.style.display = 'none';
      document.body.style.cursor = 'not-allowed';
      return;
    }
    document.body.style.cursor = 'crosshair';
    const rect = target.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.left = rect.left + 'px';
    highlight.style.top = rect.top + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
  };

  const onClick = (e: MouseEvent) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return;
    const target = findBlockTarget(el);
    if (!target || target.closest('#srb-float-btn, #srb-float-popup, .srb-picker-confirm-overlay, .srb-undo-toast')) return;

    const selector = generateSelector(target);
    deactivatePicker();
    showPickerConfirm(target, selector, getHostnameFn());
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') deactivatePicker();
  };

  handlers = { onMove, onClick, onKey };
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey);
}
