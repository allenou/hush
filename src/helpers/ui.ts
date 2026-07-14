import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { addDomain, addBlockedUrl, recordBlock, setEnabled } from '@/utils/storage';
import { getHostname } from '@/utils/url';
import { t } from '@/utils/i18n';
import { clearPageMarkerCount, reportPageMarkerCount } from '@/utils/page-badge';

let floatingBtnInjected = false;
let floatingMarkingEnabled = true;
let renderFloatingMenu: (() => void) | null = null;

export function getFloatingActionIds(enabled: boolean): string[] {
  return enabled ? ['pick', 'domain', 'url'] : ['enable'];
}

export function setFloatingMarkingEnabled(enabled: boolean): void {
  floatingMarkingEnabled = enabled;
  renderFloatingMenu?.();
}

const STORAGE_KEY = 'srb_float_pos';
const BTN_SIZE = 40;
const MARGIN = 24;
const POPUP_GAP = 12;

const FLOATING_UI_CSS = `
:host {
  --srb-surface: #ffffff;
  --srb-text: #18211d;
  --srb-border: #dde6e1;
  --srb-border-light: #e2e9e4;
  --srb-accent: #059669;
  --srb-accent-light: #ecfdf5;
  --srb-accent-mid: #d1fae5;
  --srb-shadow-sm: 0 1px 4px rgba(24, 33, 29, 0.08);
  --srb-shadow-md: 0 4px 16px rgba(24, 33, 29, 0.12);
  --srb-shadow-lg: 0 8px 24px rgba(24, 33, 29, 0.14);
  --srb-shadow-accent: 0 10px 28px rgba(5, 150, 105, 0.25);
  --srb-radius-sm: 6px;
  --srb-radius-md: 10px;
  --srb-font: -apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif;
}
.srb-float-btn {
  position: fixed;
  z-index: 999999;
  width: 40px;
  height: 40px;
  border: 1px solid var(--srb-border-light);
  border-radius: 50%;
  background: var(--srb-surface);
  font-size: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--srb-shadow-sm);
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: var(--srb-shadow-accent);
}
.srb-float-btn:active {
  transform: scale(0.95);
}
.srb-float-popup {
  z-index: 999999;
  position: fixed;
  background: var(--srb-surface);
  border: 1px solid var(--srb-border);
  border-radius: var(--srb-radius-md);
  box-shadow: var(--srb-shadow-lg);
  display: none;
  flex-direction: column;
  min-width: 170px;
  overflow: hidden;
  padding: 4px;
}
.srb-float-popup::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--srb-surface);
  border-right: 1px solid var(--srb-border);
  border-bottom: 1px solid var(--srb-border);
  transform: translateY(-50%) rotate(45deg);
}
.srb-float-popup[data-side="left"]::after {
  right: -6px;
}
.srb-float-popup[data-side="right"]::after {
  left: -6px;
  transform: translateY(-50%) rotate(225deg);
}
.srb-fopt {
  padding: 12px 16px;
  border: none;
  border-radius: var(--srb-radius-sm);
  background: none;
  cursor: pointer;
  font-size: 15px;
  text-align: left;
  color: var(--srb-text);
  font-family: var(--srb-font);
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.1s;
}
.srb-fopt:hover {
  background: var(--srb-accent-light);
  color: var(--srb-accent);
}
.srb-fopt:active {
  background: var(--srb-accent-mid);
}
`;

interface FloatPos { x: number; y: number; side?: FloatSide; vertical?: FloatVertical; }

type FloatSide = 'left' | 'right';
type FloatVertical = 'top' | 'bottom';

async function loadPos(): Promise<FloatPos | null> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data as any)[STORAGE_KEY] ?? null;
  } catch { return null; }
}

async function savePos(x: number, y: number, side: FloatSide, vertical: FloatVertical): Promise<void> {
  try { await chrome.storage.local.set({ [STORAGE_KEY]: { x, y, side, vertical } }); } catch {}
}

function getViewportRect(): { width: number; height: number; offsetLeft: number; offsetTop: number } {
  const vv = window.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetLeft: vv.offsetLeft,
      offsetTop: vv.offsetTop,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getAnchoredSide(x: number): FloatSide {
  const viewport = getViewportRect();
  const centerX = x + BTN_SIZE / 2;
  return centerX < viewport.offsetLeft + viewport.width / 2 ? 'left' : 'right';
}

function getAnchoredVertical(y: number): FloatVertical {
  const viewport = getViewportRect();
  const centerY = y + BTN_SIZE / 2;
  return centerY < viewport.offsetTop + viewport.height / 2 ? 'top' : 'bottom';
}

/** 浮动 🛡 屏蔽按钮（页面右下角），支持拖动 */
export async function injectFloatingBtn(ctx: ContentScriptContext): Promise<void> {
  if (floatingBtnInjected) {
    if (!document.querySelector('srb-floating-ui')) {
      floatingBtnInjected = false;
    } else {
      return;
    }
  }
  floatingBtnInjected = true;

  const ui = await createShadowRootUi(ctx, {
    name: 'srb-floating-ui',
    position: 'inline',
    anchor: document.body,
    append: 'last',
    css: FLOATING_UI_CSS,
    isolateEvents: true,
    onMount(uiContainer, _shadow, shadowHost) {
      mountFloatingControls(ctx, uiContainer, shadowHost);
    },
    onRemove() {
      floatingBtnInjected = false;
      renderFloatingMenu = null;
    },
  });
  ui.mount();
}

function mountFloatingControls(
  ctx: ContentScriptContext,
  uiContainer: HTMLElement,
  shadowHost: HTMLElement,
): void {
  const btn = document.createElement('button');
  btn.id = 'srb-float-btn';
  btn.className = 'srb-float-btn';
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/icon-32.png');
  img.style.width = '22px';
  img.style.height = '22px';
  img.style.pointerEvents = 'none';
  img.alt = '';
  btn.appendChild(img);
  btn.title = t('floatBtnTitle');

  const popup = document.createElement('div');
  popup.id = 'srb-float-popup';
  popup.className = 'srb-float-popup';
  function renderMenu(): void {
    popup.innerHTML = floatingMarkingEnabled
      ? `<button class="srb-fopt" data-action="pick"><span style="font-size:1.3em">✂️</span> ${t('pickAction')}</button>` +
        `<button class="srb-fopt" data-action="domain"><span style="font-size:1.3em">🌐</span> ${t('markDomainAction')}</button>` +
        `<button class="srb-fopt" data-action="url"><span style="font-size:1.3em">🔗</span> ${t('markUrlAction')}</button>`
      : `<button class="srb-fopt" data-action="enable"><span style="font-size:1.3em">▶️</span> ${t('enableMarkingAction')}</button>`;
  }
  renderFloatingMenu = renderMenu;
  renderMenu();
  let anchoredSide: FloatSide = 'right';
  let anchoredVertical: FloatVertical = 'bottom';

  function applyBtnPosition(x: number, y: number): void {
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
  }

  function getClampedPos(x: number, y: number): FloatPos {
    const viewport = getViewportRect();
    return {
      x: clamp(x, viewport.offsetLeft + MARGIN, viewport.offsetLeft + viewport.width - BTN_SIZE - MARGIN),
      y: clamp(y, viewport.offsetTop + MARGIN, viewport.offsetTop + viewport.height - BTN_SIZE - MARGIN),
    };
  }

  function syncPopupPosition(): void {
    if (popup.style.display !== 'flex') return;
    const viewport = getViewportRect();
    const btnRect = btn.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const popupWidth = popup.offsetWidth || 170;
    const popupHeight = popup.offsetHeight || 132;
    const openRight = btnCenterX < viewport.width / 2;

    popup.dataset.side = openRight ? 'right' : 'left';

    const left = openRight
      ? btnRect.right + POPUP_GAP
      : btnRect.left - popupWidth - POPUP_GAP;
    const top = clamp(
      btnRect.top + btnRect.height / 2 - popupHeight / 2,
      viewport.offsetTop + MARGIN,
      viewport.offsetTop + viewport.height - popupHeight - MARGIN,
    );

    popup.style.left = clamp(
      left,
      viewport.offsetLeft + MARGIN,
      viewport.offsetLeft + viewport.width - popupWidth - MARGIN,
    ) + 'px';
    popup.style.top = top + 'px';
  }

  async function initPos(): Promise<void> {
    const saved = await loadPos();
    const viewport = getViewportRect();
    if (saved) {
      anchoredSide = saved.side ?? getAnchoredSide(saved.x);
      anchoredVertical = saved.vertical ?? getAnchoredVertical(saved.y);
      const pos = getClampedPos(saved.x, saved.y);
      applyBtnPosition(pos.x, pos.y);
    } else {
      anchoredSide = 'right';
      anchoredVertical = 'bottom';
      applyBtnPosition(
        viewport.offsetLeft + viewport.width - BTN_SIZE - MARGIN,
        viewport.offsetTop + viewport.height - BTN_SIZE - MARGIN,
      );
    }
  }

  function getAnchoredPos(side: FloatSide, vertical: FloatVertical, x: number, y: number): FloatPos {
    const viewport = getViewportRect();
    return getClampedPos(
      side === 'left'
        ? viewport.offsetLeft + MARGIN
        : viewport.offsetLeft + viewport.width - BTN_SIZE - MARGIN,
      vertical === 'top'
        ? viewport.offsetTop + MARGIN
        : viewport.offsetTop + viewport.height - BTN_SIZE - MARGIN,
    );
  }

  // ===== 贴边 =====
  function snapToEdge(save = false): void {
    anchoredSide = getAnchoredSide(btn.offsetLeft);
    anchoredVertical = getAnchoredVertical(btn.offsetTop);
    const next = getAnchoredPos(anchoredSide, anchoredVertical, btn.offsetLeft, btn.offsetTop);
    btn.style.transition = 'left 0.25s ease';
    applyBtnPosition(next.x, next.y);
    syncPopupPosition();
    if (save) void savePos(next.x, next.y, anchoredSide, anchoredVertical);
    ctx.setTimeout(() => btn.style.transition = '', 300);
  }

  function adjustToViewport(save = false): void {
    const pos = getAnchoredPos(anchoredSide, anchoredVertical, btn.offsetLeft, btn.offsetTop);
    applyBtnPosition(pos.x, pos.y);
    syncPopupPosition();
    if (save) void savePos(pos.x, pos.y, anchoredSide, anchoredVertical);
  }

  // ===== 拖动 =====
  let dragData = { startX: 0, startY: 0, origX: 0, origY: 0, dist: 0 };
  btn.addEventListener('mousedown', (e) => {
    dragData = { startX: e.clientX, startY: e.clientY, origX: btn.offsetLeft, origY: btn.offsetTop, dist: 0 };
    btn.style.cursor = 'grabbing';
  });
  ctx.addEventListener(document, 'mousemove', (e) => {
    if (btn.style.cursor !== 'grabbing') return;
    const dx = e.clientX - dragData.startX, dy = e.clientY - dragData.startY;
    dragData.dist = Math.max(dragData.dist, Math.abs(dx), Math.abs(dy));
    const pos = getClampedPos(dragData.origX + dx, dragData.origY + dy);
    applyBtnPosition(pos.x, pos.y);
    syncPopupPosition();
  });
  ctx.addEventListener(document, 'mouseup', () => {
    if (btn.style.cursor !== 'grabbing') return;
    btn.style.cursor = '';
    if (dragData.dist > 5) snapToEdge(true);
  });

  // 点击切换弹窗（拖动超过 5px 不触发）
  btn.addEventListener('click', (e) => {
    if (dragData.dist > 5) return;
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
    if (popup.style.display === 'flex') syncPopupPosition();
  });

  popup.onclick = async (e) => {
    const target = (e.target as HTMLElement).closest('.srb-fopt') as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'enable') {
      await setEnabled(true);
      popup.style.display = 'none';
      return;
    }
    if (action === 'pick') {
      popup.style.display = 'none';
      document.dispatchEvent(new CustomEvent('srb-start-picker'));
      return;
    }

    const hostname = getHostname();
    if (action === 'domain') await addDomain(hostname);
    else await addBlockedUrl(window.location.href);
    await recordBlock(action === 'domain' ? 'domain' : 'url', hostname);
    popup.style.display = 'none';
    btn.style.opacity = '0.6';
    ctx.setTimeout(() => { btn.style.opacity = '1'; }, 1200);
  };

  // 点击按钮外区域关闭弹窗
  ctx.addEventListener(document, 'click', (e) => {
    const path = e.composedPath();
    if (!path.includes(btn) && !path.includes(popup) && !path.includes(shadowHost)) {
      popup.style.display = 'none';
    }
  });

  initPos().then(() => {
    uiContainer.appendChild(popup);
    uiContainer.appendChild(btn);

    let viewportFrame = 0;
    const handleViewportChange = () => {
      if (viewportFrame) cancelAnimationFrame(viewportFrame);
      viewportFrame = ctx.requestAnimationFrame(() => {
        viewportFrame = 0;
        if (!btn.isConnected) return;
        adjustToViewport(true);
      });
    };
    ctx.addEventListener(window, 'resize', handleViewportChange);
    if (window.visualViewport) {
      ctx.addEventListener(window.visualViewport, 'resize', handleViewportChange);
      ctx.addEventListener(window.visualViewport, 'scroll', handleViewportChange);
    }
  });
}

/** 折叠提示条 */
export function injectCollapseBar(containerSelector: string): void {
  if (document.getElementById('srb-collapse-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'srb-collapse-bar';
  bar.className = 'srb-collapse-bar';
  const c = document.querySelector(containerSelector) ?? document.body;
  (c ?? document.body).parentNode?.insertBefore(bar, c ?? null);
}

let _lastCollapseCount = -1;
let _lastCollapseDisplay = '';

export function updateCollapseBar(): void {
  reportPageMarkerCount();
  const bar = document.getElementById('srb-collapse-bar');
  if (!bar) return;
  const count = document.querySelectorAll('.srb-blocked-badge').length;
  // 值没变就不动 DOM，避免触发 MutationObserver 循环
  if (count === _lastCollapseCount) return;
  _lastCollapseCount = count;
  const display = count > 0 ? 'block' : 'none';
  if (display !== _lastCollapseDisplay) {
    bar.style.display = display;
    _lastCollapseDisplay = display;
  }
  bar.textContent = '🚫 ' + t('markedResults', String(count));
}

export function removeCollapseBar(): void {
  document.getElementById('srb-collapse-bar')?.remove();
  _lastCollapseCount = -1;
  _lastCollapseDisplay = '';
  clearPageMarkerCount();
}
