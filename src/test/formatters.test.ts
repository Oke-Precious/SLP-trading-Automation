import { describe, it, expect } from 'vitest';
import { formatPrice, formatPercent, formatDate, timeAgo } from '../lib/utils/formatters';

describe('Utility formatting functions', () => {
  it('formatPrice(64200.5) returns "64,200.5"', () => {
    expect(formatPrice(64200.5)).toBe('64,200.5');
  });

  it('formatPercent of bullish ratio returns "+2.35%"', () => {
    expect(formatPercent(0.0235)).toBe('+2.35%');
  });

  it('formatPercent of bearish ratio returns "-1.45%"', () => {
    expect(formatPercent(-0.0145)).toBe('-1.45%');
  });

  it('formatDate returns formatted date string liked "May 24, 2025"', () => {
    expect(formatDate('2025-05-24T10:00:00Z')).toBe('May 24, 2025');
  });

  it('timeAgo returns number of days ago for given date string', () => {
    // We calculate against 2026-05-25 (current year in metadata)
    // 2025-05-24 is 366 days before 2026-05-25
    const res = timeAgo('2025-05-24T10:00:00Z');
    expect(res).toContain('days ago');
  });
});
