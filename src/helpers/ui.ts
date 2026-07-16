import { t } from '@/utils/i18n';
import { clearPageMarkerCount, reportPageMarkerCount } from '@/utils/page-badge';

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
