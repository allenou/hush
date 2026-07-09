import { addDomain, addBlockedUrl, recordBlock, get, setBlockAds } from '@/utils/storage';
import { getHostname } from '@/utils/url';
import { t } from '@/utils/i18n';

let floatingBtnInjected = false;

const STORAGE_KEY = 'srb_float_pos';
const BTN_SIZE = 40;
const MARGIN = 24;
const POPUP_GAP = 12;

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
export function injectFloatingBtn(): void {
  if (floatingBtnInjected) {
    if (!document.getElementById('srb-float-btn')) {
      floatingBtnInjected = false;
    } else {
      return;
    }
  }
  floatingBtnInjected = true;

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
  popup.innerHTML =
    `<button class="srb-fopt" data-action="pick"><span style="font-size:1.3em">✂️</span> ${t('pickAction')}</button>` +
    `<button class="srb-fopt" data-action="domain"><span style="font-size:1.3em">🌐</span> ${t('markDomainAction')}</button>` +
    `<button class="srb-fopt" data-action="url"><span style="font-size:1.3em">🔗</span> ${t('markUrlAction')}</button>`;
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
    setTimeout(() => btn.style.transition = '', 300);
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
  document.addEventListener('mousemove', (e) => {
    if (btn.style.cursor !== 'grabbing') return;
    const dx = e.clientX - dragData.startX, dy = e.clientY - dragData.startY;
    dragData.dist = Math.max(dragData.dist, Math.abs(dx), Math.abs(dy));
    const pos = getClampedPos(dragData.origX + dx, dragData.origY + dy);
    applyBtnPosition(pos.x, pos.y);
    syncPopupPosition();
  });
  document.addEventListener('mouseup', () => {
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
    setTimeout(() => { btn.style.opacity = '1'; }, 1200);
  };

  // 点击按钮外区域关闭弹窗
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target as Node) && !popup.contains(e.target as Node)) popup.style.display = 'none';
  });

  initPos().then(() => {
    document.body.appendChild(popup);
    document.body.appendChild(btn);

    let viewportFrame = 0;
    const handleViewportChange = () => {
      if (viewportFrame) cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(() => {
        viewportFrame = 0;
        if (!document.getElementById('srb-float-btn')) return;
        adjustToViewport(true);
      });
    };
    window.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
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
