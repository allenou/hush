import type { BlockStats } from '@/utils/storage';

export const STATISTICS_RETENTION_DAYS = 365;

export type StatisticsRange = 7 | 30 | 90 | 180 | 365;

export interface StatisticsSummary {
  total: number;
  average: number;
  peakCount: number;
  peakDate: string | null;
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function truncateDomainLabel(domain: string, maxLength = 22): string {
  return domain.length > maxLength
    ? `${domain.slice(0, maxLength)}…`
    : domain;
}

export function buildDailySeries(
  raw: BlockStats[],
  days: number,
  now = new Date(),
): BlockStats[] {
  const statsByDate = new Map(raw.map((item) => [item.date, item]));
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  return Array.from({ length: Math.max(0, days) }, (_, index) => {
    const offset = days - index - 1;
    const localDate = new Date(year, month, date - offset);
    const key = formatLocalDateKey(localDate);
    const existing = statsByDate.get(key);
    return existing ? { ...existing } : { date: key, count: 0 };
  });
}

export function summarizeDailySeries(series: BlockStats[]): StatisticsSummary {
  let total = 0;
  let peakCount = 0;
  let peakDate: string | null = null;

  for (const item of series) {
    total += item.count;
    if (item.count > peakCount) {
      peakCount = item.count;
      peakDate = item.date;
    }
  }

  const average = series.length === 0
    ? 0
    : Math.round((total / series.length) * 10) / 10;

  return { total, average, peakCount, peakDate };
}

export function buildBlockBreakdown(
  total: number,
  ads: number,
  domains: number,
): { ads: number; domains: number; other: number } {
  return {
    ads,
    domains,
    other: Math.max(0, total - ads - domains),
  };
}
