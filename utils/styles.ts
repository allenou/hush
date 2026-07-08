const STYLE_ID = 'srb-styles';

const CSS = `
/* ===== Design Tokens ===== */
:root {
  --srb-accent: #059669;
  --srb-accent-hover: #047857;
  --srb-accent-light: #ECFDF5;
  --srb-accent-ring: #6EE7B7;
  --srb-danger: #DC2626;
  --srb-danger-light: #FEF2F2;
  --srb-danger-ring: #FCA5A5;
  --srb-amber: #D97706;
  --srb-amber-light: #FFFBEB;
  --srb-success: #10B981;
  --srb-text: #1A1A2E;
  --srb-text-secondary: #6B7280;
  --srb-surface: #FFFFFF;
  --srb-bg: #F8F8FA;
  --srb-border: #E5E7EB;
  --srb-shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --srb-shadow-md: 0 4px 12px rgba(0,0,0,0.10);
  --srb-shadow-lg: 0 8px 24px rgba(0,0,0,0.14);
  --srb-radius-sm: 6px;
  --srb-radius-md: 10px;
  --srb-radius-lg: 14px;
  --srb-font: -apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif;
  --srb-mono: "SF Mono", "JetBrains Mono", "Menlo", monospace;
}

/* ===== Floating Action Button ===== */
.srb-float-btn {
  position: fixed;
  z-index: 999999;
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border: 1px solid #E5E7EB;
  border-radius: 50%;
  background: #fff;
  font-size: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}
.srb-float-btn:active {
  transform: scale(0.95);
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}
.srb-float-btn:active {
  transform: scale(0.95);
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 18px rgba(0,0,0,0.22);
}
.srb-float-btn:active {
  transform: scale(0.95);
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 10px 28px rgba(5,150,105,0.25);
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
  background: #D1FAE5;
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
  box-shadow: 0 2px 6px rgba(5,150,105,0.15);
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
  background: #D1FAE5;
}

/* ===== Blocked Badge (redacted-document style) ===== */
.srb-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: repeating-linear-gradient(
    -45deg,
    rgba(220, 38, 38, 0.06),
    rgba(220, 38, 38, 0.06) 6px,
    rgba(220, 38, 38, 0.03) 6px,
    rgba(220, 38, 38, 0.03) 12px
  );
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
  border: 1px solid rgba(220, 38, 38, 0.25);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.srb-blocked-badge:hover {
  background: #FEE2E2;
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
  border: 1px solid rgba(5, 150, 105, 0.3);
  background: var(--srb-accent-light);
  color: var(--srb-accent);
  transition: background 0.12s;
}
.srb-cancel-badge:hover {
  background: #D1FAE5;
}

/* ===== Ad Badge — 样式与域名屏蔽一致，仅 badge 文字区分 ===== */
.srb-ad-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: repeating-linear-gradient(
    -45deg,
    rgba(220, 38, 38, 0.06),
    rgba(220, 38, 38, 0.06) 6px,
    rgba(220, 38, 38, 0.03) 6px,
    rgba(220, 38, 38, 0.03) 12px
  );
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
  border: 1px solid rgba(220, 38, 38, 0.25);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.srb-ad-badge:hover {
  background: #FEE2E2;
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
  border: 1px solid rgba(5,150,105,0.12);
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
  color: #fff;
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
  background: rgba(5,150,105,0.06);
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
  background: rgba(0,0,0,0.25);
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
  color: #fff;
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
  color: #fff;
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
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-family: var(--srb-font);
  transition: background 0.1s;
}
.srb-undo-btn:hover {
  background: rgba(255,255,255,0.1);
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
