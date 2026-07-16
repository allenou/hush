const STYLE_ID = 'srb-styles';

const CSS = `
/* ===== Design Tokens ===== */
:root {
  --srb-brand-yellow: #eab308;
  --srb-brand-soft: #fef9c3;
  --srb-primary: #2563eb;
  --srb-primary-hover: #1d4ed8;
  --srb-primary-active: #1e40af;
  --srb-primary-action: #2563eb;
  --srb-primary-action-hover: #1d4ed8;
  --srb-accent: #3b82f6;
  --srb-accent-hover: #2563eb;
  --srb-accent-light: #dbeafe;
  --srb-accent-mid: #bfdbfe;
  --srb-accent-ring: #93c5fd;
  --srb-on-primary: #ffffff;
  --srb-surface: #ffffff;
  --srb-bg: #f5f7fb;
  --srb-text: #292d38;
  --srb-text-strong: #20232d;
  --srb-text-secondary: #626978;
  --srb-text-muted: #747b8b;
  --srb-border: #e1e5ee;
  --srb-border-light: #ebedf3;
  --srb-danger: #c43d3d;
  --srb-danger-strong: #991b1b;
  --srb-danger-light: #fef2f2;
  --srb-danger-hover: #fee2e2;
  --srb-danger-ring: #fca5a5;
  --srb-danger-border: rgba(220, 38, 38, 0.25);
  --srb-warning: #92400e;
  --srb-warning-light: #fffbeb;
  --srb-success: #10b981;
  --srb-accent-border: rgba(79, 114, 232, 0.38);
  --srb-accent-border-soft: rgba(79, 114, 232, 0.22);
  --srb-accent-highlight: rgba(79, 114, 232, 0.11);
  --srb-overlay-soft: rgba(0, 0, 0, 0.25);
  --srb-on-dark-border: rgba(255, 255, 255, 0.3);
  --srb-on-dark-hover-bg: rgba(255, 255, 255, 0.1);
  --srb-shadow-xs: 0 1px 3px rgba(32, 31, 30, 0.05);
  --srb-shadow-sm: 0 2px 6px rgba(32, 31, 30, 0.07);
  --srb-shadow-md: 0 6px 18px rgba(32, 31, 30, 0.1);
  --srb-shadow-lg: 0 10px 28px rgba(32, 31, 30, 0.12);
  --srb-shadow-accent: 0 10px 26px rgba(79, 114, 232, 0.2);
  --srb-mask-danger: repeating-linear-gradient(
    -45deg,
    rgba(220, 38, 38, 0.06),
    rgba(220, 38, 38, 0.06) 6px,
    rgba(220, 38, 38, 0.03) 6px,
    rgba(220, 38, 38, 0.03) 12px
  );
  --srb-radius-sm: 6px;
  --srb-radius-md: 10px;
  --srb-radius-lg: 14px;
  --srb-font: -apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif;
  --srb-mono: "SF Mono", "JetBrains Mono", "Menlo", monospace;
}

/* ===== Block Button (on each result item) ===== */
.srb-block-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 9999;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--srb-surface);
  border: 1px solid var(--srb-border);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--srb-text-secondary);
  box-shadow: var(--srb-shadow-sm);
  transition: all 0.12s;
  font-family: var(--srb-font);
}
.srb-block-btn:hover {
  border-color: var(--srb-accent);
  color: var(--srb-accent);
  box-shadow: var(--srb-shadow-accent);
}

/* Block action popup */
.srb-popup {
  position: absolute;
  top: 32px;
  right: 0;
  z-index: 10000;
  background: var(--srb-surface);
  border: 1px solid var(--srb-border);
  border-radius: var(--srb-radius-sm);
  box-shadow: var(--srb-shadow-md);
  display: none;
  flex-direction: column;
  min-width: 150px;
  overflow: hidden;
  padding: 4px;
}
.srb-opt {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  color: var(--srb-text);
  font-family: var(--srb-font);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.1s;
}
.srb-opt:hover {
  background: var(--srb-accent-light);
  color: var(--srb-accent);
}
.srb-opt:active {
  background: var(--srb-accent-mid);
}

/* ===== Blocked Badge (redacted-document style) ===== */
.srb-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: var(--srb-mask-danger);
}

.srb-blocked-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 9999;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--srb-danger-light);
  color: var(--srb-danger);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--srb-font);
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--srb-danger-border);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.srb-blocked-badge:hover {
  background: var(--srb-danger-hover);
}

/* ===== Cancel Badge (hover 显示在 badge 上方) ===== */
.srb-cancel-badge {
  display: none;
  position: absolute;
  bottom: 34px;
  right: 6px;
  z-index: 10000;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--srb-font);
  line-height: normal;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--srb-accent-border);
  background: var(--srb-accent-light);
  color: var(--srb-accent);
  transition: background 0.12s;
}
.srb-cancel-badge:hover {
  background: var(--srb-accent-mid);
}

/* ===== Ad Badge — 样式与域名屏蔽一致，仅 badge 文字区分 ===== */
.srb-ad-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: var(--srb-mask-danger);
}

.srb-ad-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 9999;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--srb-danger-light);
  color: var(--srb-danger);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--srb-font);
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--srb-danger-border);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.srb-ad-badge:hover {
  background: var(--srb-danger-hover);
}

/* ===== Collapse Bar ===== */
.srb-collapse-bar {
  padding: 8px 14px;
  margin: 6px 0;
  font-size: 15px;
  font-family: var(--srb-font);
  background: var(--srb-accent-light);
  color: var(--srb-accent);
  border-radius: var(--srb-radius-sm);
  display: none;
  font-weight: 500;
  border: 1px solid var(--srb-accent-border-soft);
}

/* ===== Picker Tooltip ===== */
.srb-picker-tooltip {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  padding: 10px 16px;
  background: var(--srb-accent);
  color: var(--srb-on-primary);
  font-size: 15px;
  font-family: var(--srb-font);
  text-align: center;
  box-shadow: var(--srb-shadow-md);
  letter-spacing: 0.01em;
}

/* Picker Highlight */
.srb-picker-highlight {
  position: fixed;
  z-index: 999998;
  pointer-events: none;
  border: 2px solid var(--srb-accent);
  background: var(--srb-accent-highlight);
  border-radius: var(--srb-radius-sm);
  transition: all 0.06s ease;
  display: none;
}

/* Picker Confirm Dialog */
.srb-picker-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--srb-overlay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.srb-picker-confirm-box {
  background: var(--srb-surface);
  border-radius: var(--srb-radius-md);
  box-shadow: var(--srb-shadow-lg);
  padding: 24px;
  max-width: 480px;
  width: 90%;
  font-size: 15px;
  font-family: var(--srb-font);
  line-height: 1.5;
  color: var(--srb-text);
}
.srb-picker-confirm-title {
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 15px;
  color: var(--srb-text);
}
.srb-picker-confirm-code {
  background: var(--srb-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: var(--srb-mono);
  font-size: 12px;
  color: var(--srb-accent);
}
.srb-picker-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}
.srb-picker-cancel {
  padding: 8px 20px;
  border: 1px solid var(--srb-border);
  border-radius: var(--srb-radius-sm);
  background: var(--srb-surface);
  cursor: pointer;
  font-size: 15px;
  font-family: var(--srb-font);
  color: var(--srb-text-secondary);
  transition: background 0.1s;
}
.srb-picker-cancel:hover {
  background: var(--srb-bg);
}
.srb-picker-ok {
  padding: 8px 20px;
  border: none;
  border-radius: var(--srb-radius-sm);
  background: var(--srb-accent);
  color: var(--srb-on-primary);
  cursor: pointer;
  font-size: 15px;
  font-family: var(--srb-font);
  font-weight: 500;
  transition: background 0.1s;
}
.srb-picker-ok:hover {
  background: var(--srb-accent-hover);
}

/* ===== Undo Toast ===== */
.srb-undo-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--srb-text);
  color: var(--srb-on-primary);
  padding: 10px 20px;
  border-radius: var(--srb-radius-sm);
  font-size: 15px;
  font-family: var(--srb-font);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--srb-shadow-lg);
}
.srb-undo-btn {
  padding: 4px 14px;
  border: 1px solid var(--srb-on-dark-border);
  border-radius: 4px;
  background: transparent;
  color: var(--srb-on-primary);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--srb-font);
  transition: background 0.1s;
}
.srb-undo-btn:hover {
  background: var(--srb-on-dark-hover-bg);
}

/* Picker 激活时屏蔽 badge 指针事件，避免干扰选取 */
.srb-picker-active .srb-blocked-badge,
.srb-picker-active .srb-ad-badge {
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
