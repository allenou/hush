import { formatDate, t } from '@/utils/i18n';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MINUTE_MS) return t('justNow');
  if (diff < HOUR_MS) return t('minutesAgo', String(Math.floor(diff / MINUTE_MS)));
  if (diff < DAY_MS) return t('hoursAgo', String(Math.floor(diff / HOUR_MS)));
  const d = new Date(ts);
  return formatDate(d, { month: 'numeric', day: 'numeric' });
}
