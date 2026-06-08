import { addDomain, addBlockedUrl, recordBlock } from './storage';
import { getHostname } from './url';

/** 浮动 🛡 屏蔽按钮（页面右下角） */
export function injectFloatingBtn(): void {
  if (document.getElementById('srb-float-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'srb-float-btn';
  btn.innerHTML = '🛡';
  btn.title = '屏蔽此网站';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;width:48px;height:48px;border-radius:50%;background:#007bff;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);user-select:none;transition:transform 0.15s;';
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = () => { btn.style.transform = ''; };

  const popup = document.createElement('div');
  popup.id = 'srb-float-popup';
  popup.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:none;flex-direction:column;min-width:160px;overflow:hidden;';
  popup.innerHTML = '<button class="srb-fopt" data-action="domain" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;border-bottom:1px solid #eee;">🌐 屏蔽此域名</button><button class="srb-fopt" data-action="url" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13px;text-align:left;">🔗 屏蔽此链接</button>';

  btn.onclick = (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex'; };

  popup.onclick = async (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains('srb-fopt')) return;
    if (t.getAttribute('data-action') === 'domain') await addDomain(getHostname());
    else await addBlockedUrl(window.location.href);
    await recordBlock();
    popup.style.display = 'none';
    btn.innerHTML = '✅';
    btn.style.background = '#28a745';
    setTimeout(() => { btn.innerHTML = '🛡'; btn.style.background = '#007bff'; }, 1500);
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
  bar.style.cssText = 'padding:6px 12px;margin:4px 0;font-size:13px;background:#fff3cd;color:#856404;border-radius:4px;display:none;';
  const c = document.querySelector(containerSelector) ?? document.body;
  (c ?? document.body).parentNode?.insertBefore(bar, c ?? null);
}

export function updateCollapseBar(): void {
  const bar = document.getElementById('srb-collapse-bar');
  if (!bar) return;
  const count = document.querySelectorAll('.srb-blocked-badge').length;
  bar.textContent = '🚫 已屏蔽 ' + count + ' 个低质���结果';
  bar.style.display = count > 0 ? 'block' : 'none';
}
