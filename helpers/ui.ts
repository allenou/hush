import { addDomain, addBlockedUrl, recordBlock, get, setBlockAds } from '../utils/storage';
import { getHostname } from '../utils/url';
import { isSearchEngine } from './search-engines';

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
  img.style.pointerEvents = 'none';
  img.alt = '';
  btn.appendChild(img);
  btn.title = '搜索结果屏蔽工具';

  const popup = document.createElement('div');
  popup.id = 'srb-float-popup';
  popup.className = 'srb-float-popup';
  if (isSearchEngine(window.location.href)) {
    popup.innerHTML = '<button class="srb-fopt" data-action="pick"><span style="font-size:1.3em">✂️</span> 选取屏蔽</button>';
  } else {
    popup.innerHTML =
      '<button class="srb-fopt" data-action="domain"><span style="font-size:1.3em">🌐</span> 屏蔽此域名</button>' +
      '<button class="srb-fopt" data-action="url"><span style="font-size:1.3em">🔗</span> 屏蔽此链接</button>';
  }

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

  // ===== 贴边 =====
  function snapToEdge(): void {
    const cx = btn.offsetLeft + BTN_SIZE / 2, sn = cx < window.innerWidth / 2;
    btn.style.transition = 'left 0.25s ease';
    btn.style.left = (sn ? MARGIN : window.innerWidth - BTN_SIZE - MARGIN) + 'px';
    setTimeout(() => btn.style.transition = '', 300);
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
    btn.style.left = Math.max(0, Math.min(window.innerWidth - BTN_SIZE, dragData.origX + dx)) + 'px';
    btn.style.top = Math.max(0, Math.min(window.innerHeight - BTN_SIZE, dragData.origY + dy)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (btn.style.cursor !== 'grabbing') return;
    btn.style.cursor = '';
    if (dragData.dist > 5) snapToEdge();
  });

  // 点击切换弹窗（拖动超过 5px 不触发）
  btn.addEventListener('click', (e) => {
    if (dragData.dist > 5) return;
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
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

    if (action === 'domain') await addDomain(getHostname());
    else await addBlockedUrl(window.location.href);
    await recordBlock();
    popup.style.display = 'none';
    btn.style.opacity = '0.6';
    setTimeout(() => { btn.style.opacity = '1'; }, 1200);
  };

  // 点击按钮外区域关闭弹窗
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target as Node) && !popup.contains(e.target as Node)) popup.style.display = 'none';
  });

  initPos().then(() => {
    btn.appendChild(popup);
    document.body.appendChild(btn);
    // 可视区域改变后自动贴边
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!document.getElementById('srb-float-btn')) return;
        snapToEdge();
        const left = parseInt(btn.style.left, 10);
        if (!isNaN(left)) savePos(left, btn.offsetTop);
      }, 200);
    });
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
  bar.textContent = '🚫 已屏蔽 ' + count + ' 个低质结果';
}
