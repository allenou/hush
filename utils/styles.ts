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
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: var(--srb-accent);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--srb-shadow-lg);
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.srb-float-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 10px 28px rgba(5,150,105,0.25);
}
.srb-float-btn:active {
  transform: scale(0.95);
}

.srb-float-popup {
  position: fixed;
  bottom: 76px;
  right: 28px;
  z-index: 999999;
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
  bottom: -6px;
  right: 14px;
  width: 10px;
  height: 10px;
  background: var(--srb-surface);
  border-right: 1px solid var(--srb-border);
  border-bottom: 1px solid var(--srb-border);
  transform: rotate(45deg);
}
.srb-fopt {
  padding: 9px 12px;
  border: none;
  border-radius: var(--srb-radius-sm);
  background: none;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  color: var(--srb-text);
  font-family: var(--srb-font);
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 13px;
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

/* ===== Blocked Badge (stamp effect) ===== */
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
  top: 6px;
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
  backdrop-filter: blur(2px);
}
.srb-blocked-badge:hover {
  background: #FEE2E2;
}

/* ===== Ad Badge ===== */
.srb-ad-mask {
  position: absolute;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background: rgba(255,251,235,0.8);
}

.srb-ad-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 9999;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--srb-amber-light);
  color: var(--srb-amber);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--srb-font);
  cursor: pointer;
  user-select: none;
  border: 1px solid rgba(217,119,6,0.25);
  letter-spacing: 0.02em;
  transition: background 0.12s;
}
.srb-ad-badge:hover {
  background: #FDE68A;
}

/* ===== Collapse Bar ===== */
.srb-collapse-bar {
  padding: 8px 14px;
  margin: 6px 0;
  font-size: 13px;
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
  font-size: 14px;
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
  font-size: 13px;
  font-family: var(--srb-font);
  line-height: 1.5;
  color: var(--srb-text);
}
.srb-picker-confirm-title {
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 16px;
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
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}
.srb-picker-cancel {
  padding: 8px 20px;
  border: 1px solid var(--srb-border);
  border-radius: var(--srb-radius-sm);
  background: var(--srb-surface);
  cursor: pointer;
  font-size: 13px;
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
  font-size: 13px;
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
  background: var(--srb-text);
  color: #fff;
  padding: 10px 20px;
  border-radius: var(--srb-radius-sm);
  font-size: 13px;
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
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
