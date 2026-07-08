export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MINUTE_MS) return '刚刚';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} 分钟前`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} 小时前`;
  const d = new Date(ts);
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
