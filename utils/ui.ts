import { addDomain, addBlockedUrl, recordBlock, get, setBlockAds } from './storage';
import { getHostname } from './url';

let floatingBtnInjected = false;

/** 浮动 🛡 屏蔽按钮（页面右下角） */
export function injectFloatingBtn(): void {
  // SPA 翻页后 DOM 可能被清空重建，检测并重新注入
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
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.08)'; };
  btn.onmouseleave = () => { btn.style.transform = ''; };

  const popup = document.createElement('div');
  popup.id = 'srb-float-popup';
  popup.className = 'srb-float-popup';
  popup.innerHTML =
    '<button class="srb-fopt" data-action="domain">🌐 屏蔽此域名</button>' +
    '<button class="srb-fopt" data-action="url">🔗 屏蔽此链接</button>' +
    '<button class="srb-fopt" data-action="pick">✂️ 选取屏蔽</button>';


  btn.onclick = (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; };

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
  document.body.appendChild(btn);
  document.body.appendChild(popup);
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
