const STYLE_ID = 'srb-styles';

const CSS = `
/* 浮动按钮 */
.srb-float-btn {
  position:fixed; bottom:24px; right:24px; z-index:999999;
  width:48px; height:48px; border-radius:50%;
  background:#007bff; color:#fff; font-size:22px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.25);
  user-select:none; transition:transform 0.15s;
}
.srb-float-popup {
  position:fixed; bottom:80px; right:24px; z-index:999999;
  background:#fff; border:1px solid #ddd; border-radius:10px;
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
  display:none; flex-direction:column; min-width:160px; overflow:hidden;
}
.srb-fopt {
  padding:10px 16px; border:none; background:none;
  cursor:pointer; font-size:13px; text-align:left;
}
.srb-fopt + .srb-fopt { border-top:1px solid #eee; }
.srb-fopt:hover { background:#f5f5f5; }

/* ⊕ 按钮和弹出菜单 */
.srb-block-btn {
  position:absolute; top:4px; right:4px; z-index:9999;
  width:22px; height:22px; border:1px solid #ccc; border-radius:50%;
  background:#fff; cursor:pointer; font-size:14px; line-height:1;
  display:none; align-items:center; justify-content:center; padding:0;
}
.srb-block-btn:hover { background:#f0f0f0; }
.srb-popup {
  position:absolute; top:28px; right:0; z-index:10000;
  background:#fff; border:1px solid #ddd; border-radius:6px;
  box-shadow:0 2px 8px rgba(0,0,0,0.15);
  display:none; flex-direction:column; min-width:150px;
}
.srb-opt {
  padding:8px 12px; border:none; background:none;
  cursor:pointer; text-align:left; font-size:13px;
}
.srb-opt + .srb-opt { border-top:1px solid #eee; }
.srb-opt:hover { background:#f5f5f5; }

/* 已屏蔽徽章和蒙版 */
.srb-mask {
  position:absolute; inset:0; z-index:9998;
  background:rgba(255,255,255,0.55); pointer-events:none;
}
.srb-blocked-badge {
  position:absolute; top:4px; right:4px; z-index:9999;
  padding:2px 8px; border-radius:4px;
  background:#e8e8e8; color:#666; font-size:11px;
  cursor:pointer; user-select:none;
}
.srb-blocked-badge:hover { background:#d0d0d0; }

/* 折叠条 */
.srb-collapse-bar {
  padding:6px 12px; margin:4px 0; font-size:13px;
  background:#fff3cd; color:#856404; border-radius:4px; display:none;
}

/* Picker 提示条 */
.srb-picker-tooltip {
  position:fixed; top:0; left:0; right:0; z-index:999999;
  padding:10px 16px; background:#007bff; color:#fff;
  font-size:14px; text-align:center;
  box-shadow:0 2px 8px rgba(0,0,0,0.2);
}

/* Picker 高亮 */
.srb-picker-highlight {
  position:fixed; z-index:999998; pointer-events:none;
  border:2px solid #007bff; background:rgba(0,123,255,0.08);
  transition:all 0.08s; display:none;
}

/* Picker 确认弹窗 */
.srb-picker-confirm-overlay {
  position:fixed; inset:0; z-index:999999;
  background:rgba(0,0,0,0.3);
  display:flex; align-items:center; justify-content:center;
}
.srb-picker-confirm-box {
  background:#fff; border-radius:10px;
  box-shadow:0 4px 24px rgba(0,0,0,0.25);
  padding:20px; max-width:480px; width:90%; font-size:13px; line-height:1.5;
}
.srb-picker-confirm-title {
  margin-bottom:12px; font-weight:600; font-size:15px;
}
.srb-picker-confirm-code {
  background:#f5f5f5; padding:1px 6px; border-radius:3px;
}
.srb-picker-confirm-actions {
  display:flex; gap:8px; justify-content:flex-end;
}
.srb-picker-cancel {
  padding:8px 20px; border:1px solid #ccc; border-radius:6px;
  background:#fff; cursor:pointer; font-size:13px;
}
.srb-picker-cancel:hover { background:#f5f5f5; }
.srb-picker-ok {
  padding:8px 20px; border:none; border-radius:6px;
  background:#c00; color:#fff; cursor:pointer; font-size:13px;
}
.srb-picker-ok:hover { background:#a00; }

/* 撤销 Toast */
.srb-undo-toast {
  position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
  z-index:999999; background:#333; color:#fff;
  padding:10px 20px; border-radius:8px; font-size:13px;
  display:flex; align-items:center; gap:12px;
  box-shadow:0 4px 16px rgba(0,0,0,0.3);
}
.srb-undo-btn {
  padding:4px 12px; border:1px solid #fff; border-radius:4px;
  background:transparent; color:#fff; cursor:pointer; font-size:12px;
}
.srb-undo-btn:hover { background:rgba(255,255,255,0.15); }
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
