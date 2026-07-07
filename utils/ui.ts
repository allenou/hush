import { addDomain, addBlockedUrl, recordBlock, get, setBlockAds } from './storage';
import { getHostname } from './url';

let floatingBtnInjected = false;

const STORAGE_KEY = 'srb_float_pos';

interface FloatPos { x: number; y: number; }

async function loadPos(): Promise<FloatPos | null> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data as any)[STORAGE_KEY] ?? null;
  } catch { return null; }
}

async function savePos(x: number, y: number): Promise<void> {
  try { await chrome.storage.local.set({ [STORAGE_KEY]: { x, y } }); } catch {}
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
  img.alt = '';
  btn.appendChild(img);
  btn.title = '搜索结果屏蔽工具';

  const popup = document.createElement('div');
  popup.id = 'srb-float-popup';
  popup.className = 'srb-float-popup';
  popup.innerHTML =
    '<button class="srb-fopt" data-action="domain">🌐 屏蔽此域名</button>' +
    '<button class="srb-fopt" data-action="url">🔗 屏蔽此链接</button>' +
    '<button class="srb-fopt" data-action="pick">✂️ 选取屏蔽</button>';

  // ===== 位置初始化 =====
  const BTN_SIZE = 40;
  const MARGIN = 24;

  async function initPos(): Promise<void> {
    const saved = await loadPos();
    if (saved) {
      btn.style.left = saved.x + 'px';
      btn.style.top = saved.y + 'px';
    } else {
      btn.style.left = (window.innerWidth - BTN_SIZE - MARGIN) + 'px';
      btn.style.top = (window.innerHeight - BTN_SIZE - MARGIN) + 'px';
    }
  }

  // ===== 拖动逻辑 =====
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let origX = 0, origY = 0;

  function onDown(e: MouseEvent | TouchEvent): void {
    // 如果点击目标是弹窗内的按钮，不触发拖动
    const t = e.target as HTMLElement;
    if (t.closest('.srb-fopt') || t.closest('.srb-float-popup')) return;

    dragging = true;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartX = cx;
    dragStartY = cy;
    origX = btn.offsetLeft;
    origY = btn.offsetTop;
    btn.style.transition = 'none';
    btn.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onMove(e: MouseEvent | TouchEvent): void {
    if (!dragging) return;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = cx - dragStartX;
    const dy = cy - dragStartY;
    let nx = Math.max(0, Math.min(window.innerWidth - BTN_SIZE, origX + dx));
    let ny = Math.max(0, Math.min(window.innerHeight - BTN_SIZE, origY + dy));
    btn.style.left = nx + 'px';
    btn.style.top = ny + 'px';
  }

  function onUp(): void {
    if (!dragging) return;
    dragging = false;
    btn.style.cursor = '';
    // 靠向最近的边
    const cx = btn.offsetLeft + BTN_SIZE / 2;
    const snapLeft = cx < window.innerWidth / 2;
    btn.style.transition = 'left 0.25s ease';
    const snapX = snapLeft ? MARGIN : window.innerWidth - BTN_SIZE - MARGIN;
    btn.style.left = snapX + 'px';
    setTimeout(() => { btn.style.transition = ''; }, 300);
    savePos(snapX, btn.offsetTop);
  }

  // 切换 click / drag 区分
  let pointerDownPos = { x: 0, y: 0 };
  btn.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.srb-fopt') || t.closest('.srb-float-popup')) return;
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });
  btn.addEventListener('pointerup', (e) => {
    const dx = Math.abs(e.clientX - pointerDownPos.x);
    const dy = Math.abs(e.clientY - pointerDownPos.y);
    // 如果拖动距离很小(<5px)，视为点击
    if (dx < 5 && dy < 5) {
      popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
    }
  });

  btn.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  btn.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);

  popup.onclick = async (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains('srb-fopt')) return;
    const action = t.getAttribute('data-action');
    if (action === 'pick') {
      popup.style.display = 'none';
      document.dispatchEvent(new CustomEvent('srb-start-picker'));
      return;
    }
    if (action === 'domain') await addDomain(getHostname());
    else await addBlockedUrl(window.location.href);
    await recordBlock();
    popup.style.display = 'none';
    btn.style.opacity = '0.6';
    setTimeout(() => { btn.style.opacity = '1'; }, 1200);
  };

  document.addEventListener('click', () => { popup.style.display = 'none'; }, true);

  initPos().then(() => {
    document.body.appendChild(btn);
    document.body.appendChild(popup);
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

export function updateCollapseBar(): void {
  const bar = document.getElementById('srb-collapse-bar');
  if (!bar) return;
  const count = document.querySelectorAll('.srb-blocked-badge').length;
  bar.textContent = '🚫 已屏蔽 ' + count + ' 个低质结果';
  bar.style.display = count > 0 ? 'block' : 'none';
}
