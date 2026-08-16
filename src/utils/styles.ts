const STYLE_ID = 'hush-styles';

const BADGE_FONT_SIZE = '11px';
const BADGE_LINE_HEIGHT = '15px';

const CSS = `
/* ===== Design Tokens ===== */
:root {
  --hush-brand-yellow: #eab308;
  --hush-brand-soft: #fef9c3;
  --hush-primary: #2563eb;
  --hush-primary-hover: #1d4ed8;
  --hush-primary-active: #1e40af;
  --hush-primary-action: #2563eb;
  --hush-primary-action-hover: #1d4ed8;
  --hush-accent: #3b82f6;
  --hush-accent-hover: #2563eb;
  --hush-accent-light: #dbeafe;
  --hush-accent-mid: #bfdbfe;
  --hush-accent-ring: #93c5fd;
  --hush-on-primary: #ffffff;
  --hush-surface: #ffffff;
  --hush-bg: #f5f7fb;
  --hush-text: #292d38;
  --hush-text-strong: #20232d;
  --hush-text-secondary: #626978;
  --hush-text-muted: #747b8b;
  --hush-border: #e1e5ee;
  --hush-border-light: #ebedf3;
  --hush-danger: #c43d3d;
  --hush-danger-strong: #991b1b;
  --hush-danger-light: #fef2f2;
  --hush-danger-hover: #fee2e2;
  --hush-danger-ring: #fca5a5;
  --hush-danger-border: rgba(220, 38, 38, 0.25);
  --hush-warning: #92400e;
  --hush-warning-light: #fffbeb;
  --hush-success: #10b981;
  --hush-accent-border: rgba(79, 114, 232, 0.38);
  --hush-accent-border-soft: rgba(79, 114, 232, 0.22);
  --hush-accent-highlight: rgba(79, 114, 232, 0.11);
  --hush-overlay-soft: rgba(0, 0, 0, 0.25);
  --hush-on-dark-border: rgba(255, 255, 255, 0.3);
  --hush-on-dark-hover-bg: rgba(255, 255, 255, 0.1);
  --hush-shadow-xs: 0 1px 3px rgba(32, 31, 30, 0.05);
  --hush-shadow-sm: 0 2px 6px rgba(32, 31, 30, 0.07);
  --hush-shadow-md: 0 6px 18px rgba(32, 31, 30, 0.1);
  --hush-shadow-lg: 0 10px 28px rgba(32, 31, 30, 0.12);
  --hush-shadow-accent: 0 10px 26px rgba(79, 114, 232, 0.2);
  --hush-mask-danger: repeating-linear-gradient(
    -45deg,
    rgba(220, 38, 38, 0.06),
    rgba(220, 38, 38, 0.06) 6px,
    rgba(220, 38, 38, 0.03) 6px,
    rgba(220, 38, 38, 0.03) 12px
  );
  --hush-radius-sm: 6px;
  --hush-radius-md: 10px;
  --hush-radius-lg: 14px;
  --hush-font: -apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif;
  --hush-mono: "SF Mono", "JetBrains Mono", "Menlo", monospace;
}

/* ===== Blocked Badge (redacted-document style) ===== */
.hush-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: var(--hush-mask-danger);
}

.hush-blocked-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 9999;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--hush-danger-light);
  color: var(--hush-danger);
  font-size: 11px !important;
  line-height: 15px !important;
  font-weight: 600;
  font-family: var(--hush-font);
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--hush-danger-border);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.hush-blocked-badge:hover {
  background: var(--hush-danger-hover);
}

/* ===== Ad Badge — 样式与域名屏蔽一致，仅 badge 文字区分 ===== */
[data-hush-ad-hidden="true"] {
  display: none !important;
}

[data-hush-rule-hidden="true"] {
  display: none !important;
}

.hush-ad-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: var(--hush-mask-danger);
}

.hush-ad-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 9999;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--hush-danger-light);
  color: var(--hush-danger);
  font-size: 11px !important;
  line-height: 15px !important;
  font-weight: 600;
  font-family: var(--hush-font);
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--hush-danger-border);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.hush-ad-badge:hover {
  background: var(--hush-danger-hover);
}

/* ===== Picker Tooltip ===== */
.hush-picker-tooltip {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  padding: 10px 16px;
  background: var(--hush-accent);
  color: var(--hush-on-primary);
  font-size: 15px;
  font-family: var(--hush-font);
  text-align: center;
  box-shadow: var(--hush-shadow-md);
  letter-spacing: 0.01em;
}

/* Picker Highlight */
.hush-picker-highlight {
  position: fixed;
  z-index: 999998;
  pointer-events: none;
  border: 2px solid var(--hush-accent);
  background: var(--hush-accent-highlight);
  border-radius: var(--hush-radius-sm);
  transition: all 0.06s ease;
  display: none;
}

/* Picker Confirm Dialog */
.hush-picker-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--hush-overlay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.hush-picker-confirm-box {
  background: var(--hush-surface);
  border-radius: var(--hush-radius-md);
  box-shadow: var(--hush-shadow-lg);
  padding: 24px;
  max-width: 480px;
  width: 90%;
  font-size: 15px;
  font-family: var(--hush-font);
  line-height: 1.5;
  color: var(--hush-text);
}
.hush-picker-confirm-title {
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 15px;
  color: var(--hush-text);
}
.hush-picker-confirm-code {
  background: var(--hush-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: var(--hush-mono);
  font-size: 12px;
  color: var(--hush-accent);
}
.hush-picker-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}
.hush-picker-cancel {
  padding: 8px 20px;
  border: 1px solid var(--hush-border);
  border-radius: var(--hush-radius-sm);
  background: var(--hush-surface);
  cursor: pointer;
  font-size: 15px;
  font-family: var(--hush-font);
  color: var(--hush-text-secondary);
  transition: background 0.1s;
}
.hush-picker-cancel:hover {
  background: var(--hush-bg);
}
.hush-picker-ok {
  padding: 8px 20px;
  border: none;
  border-radius: var(--hush-radius-sm);
  background: var(--hush-accent);
  color: var(--hush-on-primary);
  cursor: pointer;
  font-size: 15px;
  font-family: var(--hush-font);
  font-weight: 500;
  transition: background 0.1s;
}
.hush-picker-ok:hover {
  background: var(--hush-accent-hover);
}

/* ===== Undo Toast ===== */
.hush-undo-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--hush-text);
  color: var(--hush-on-primary);
  padding: 10px 20px;
  border-radius: var(--hush-radius-sm);
  font-size: 15px;
  font-family: var(--hush-font);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--hush-shadow-lg);
}
.hush-undo-btn {
  padding: 4px 14px;
  border: 1px solid var(--hush-on-dark-border);
  border-radius: 4px;
  background: transparent;
  color: var(--hush-on-primary);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--hush-font);
  transition: background 0.1s;
}
.hush-undo-btn:hover {
  background: var(--hush-on-dark-hover-bg);
}

/* Picker 激活时屏蔽 badge 指针事件，避免干扰选取 */
.hush-picker-active .hush-blocked-badge,
.hush-picker-active .hush-ad-badge {
  pointer-events: none;
}
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** 锁定注入 badge 的字号，避免被宿主页面的高优先级样式覆盖。 */
export function lockBadgeTypography(element: HTMLElement): void {
  element.style.setProperty('font-size', BADGE_FONT_SIZE, 'important');
  element.style.setProperty('line-height', BADGE_LINE_HEIGHT, 'important');
}
