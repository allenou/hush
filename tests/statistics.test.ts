import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBlockBreakdown,
  buildDailySeries,
  formatLocalDateKey,
  summarizeDailySeries,
  truncateDomainLabel,
} from '@/utils/statistics';

describe('formatLocalDateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('TZ', 'Asia/Shanghai');
    vi.setSystemTime(new Date('2026-03-01T00:30:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns the local calendar date near midnight', () => {
    expect(formatLocalDateKey(new Date())).toBe('2026-03-01');
  });
});

describe('truncateDomainLabel', () => {
  it('keeps short domains and truncates longer labels after 22 characters', () => {
    expect(truncateDomainLabel('short.example')).toBe('short.example');
    expect(truncateDomainLabel('12345678901234567890123')).toBe('1234567890123456789012…');
  });
});

describe('buildDailySeries', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Asia/Shanghai');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fills missing dates with zero for the latest 7 local calendar days', () => {
    const result = buildDailySeries(
      [
        { date: '2026-04-24', count: 2 },
        { date: '2026-04-27', count: 5 },
        { date: '2026-04-30', count: 1 },
      ],
      7,
      new Date(2026, 3, 30, 12),
    );

    expect(result).toEqual([
      { date: '2026-04-24', count: 2 },
      { date: '2026-04-25', count: 0 },
      { date: '2026-04-26', count: 0 },
      { date: '2026-04-27', count: 5 },
      { date: '2026-04-28', count: 0 },
      { date: '2026-04-29', count: 0 },
      { date: '2026-04-30', count: 1 },
    ]);
  });

  it('uses the local date near midnight when UTC is still the previous day', () => {
    expect(buildDailySeries(
      [],
      1,
      new Date('2026-03-01T00:30:00+08:00'),
    )).toEqual([
      { date: '2026-03-01', count: 0 },
    ]);
  });

  it('produces local calendar dates correctly across a month boundary', () => {
    expect(buildDailySeries(
      [],
      3,
      new Date('2026-03-01T00:30:00+08:00'),
    )).toEqual([
      { date: '2026-02-27', count: 0 },
      { date: '2026-02-28', count: 0 },
      { date: '2026-03-01', count: 0 },
    ]);
  });
});

describe('summarizeDailySeries', () => {
  it('returns the total, one-decimal average, and first peak date', () => {
    const result = summarizeDailySeries([
      { date: '2026-07-10', count: 1 },
      { date: '2026-07-11', count: 4 },
      { date: '2026-07-12', count: 2 },
      { date: '2026-07-13', count: 4 },
    ]);

    expect(result).toEqual({
      total: 11,
      average: 2.8,
      peakCount: 4,
      peakDate: '2026-07-11',
    });
  });

  it('returns stable zero values for an empty series', () => {
    expect(summarizeDailySeries([])).toEqual({
      total: 0,
      average: 0,
      peakCount: 0,
      peakDate: null,
    });
  });

  it('uses a null peak date when every count is zero', () => {
    expect(summarizeDailySeries([
      { date: '2026-07-12', count: 0 },
      { date: '2026-07-13', count: 0 },
    ])).toEqual({
      total: 0,
      average: 0,
      peakCount: 0,
      peakDate: null,
    });
  });
});

describe('buildBlockBreakdown', () => {
  it('keeps typed counts and never returns a negative legacy count', () => {
    expect(buildBlockBreakdown(5, 4, 3, 2, 1)).toEqual({
      ads: 4,
      domains: 3,
      urls: 2,
      selectors: 1,
      legacy: 0,
    });
    expect(buildBlockBreakdown(12, 4, 3, 2, 1)).toEqual({
      ads: 4,
      domains: 3,
      urls: 2,
      selectors: 1,
      legacy: 2,
    });
  });
});
