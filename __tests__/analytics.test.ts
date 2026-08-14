import { describe, expect, it } from 'vitest';
import { buildAnalytics, type MonthlySpendRow } from '@/lib/analytics';

const now = new Date(2026, 7, 11); // 11 August 2026

function row(month: string, category: string | null, total: number | string): MonthlySpendRow {
  return { month, category, total };
}

describe('buildAnalytics', () => {
  it('lays months out oldest first, ending with the current one', () => {
    const data = buildAnalytics([], now);
    expect(data.months).toHaveLength(12);
    expect(data.months[0]).toBe('2025-09');
    expect(data.months.at(-1)).toBe('2026-08');
  });

  it('aligns totals to the month slots and zero-fills the gaps', () => {
    const data = buildAnalytics(
      [row('2026-06', 'Transport', 100), row('2026-08', 'Locuință & Facturi', 50)],
      now,
    );

    const byMonth = Object.fromEntries(data.monthTotals.map((m) => [m.month, m.total]));
    expect(byMonth['2026-06']).toBe(100);
    expect(byMonth['2026-07']).toBe(0);
    expect(byMonth['2026-08']).toBe(50);
    expect(data.windowTotal).toBe(150);
  });

  it('sums several categories into one month total', () => {
    const data = buildAnalytics(
      [row('2026-07', 'Transport', 30), row('2026-07', 'Locuință & Facturi', 70)],
      now,
    );

    expect(data.monthTotals.find((m) => m.month === '2026-07')?.total).toBe(100);
  });

  it('parses numeric strings, the way Postgres returns numeric', () => {
    const data = buildAnalytics([row('2026-07', 'Transport', '123.45')], now);
    expect(data.monthTotals.find((m) => m.month === '2026-07')?.total).toBeCloseTo(123.45);
  });

  it('excludes the partial current month from the average', () => {
    const data = buildAnalytics(
      [
        row('2026-06', 'Transport', 100),
        row('2026-07', 'Transport', 200),
        row('2026-08', 'Transport', 5), // in progress, deliberately tiny
      ],
      now,
    );

    // Mean of June and July only. Including August would report 101.67.
    expect(data.monthlyAverage).toBeCloseTo(150);
    expect(data.completeMonthCount).toBe(2);
  });

  it('averages from the first month with data, not across the empty lead-in', () => {
    const data = buildAnalytics(
      [row('2026-06', 'Transport', 100), row('2026-07', 'Transport', 200)],
      now,
    );

    // A new account has nine empty months before June; dividing by those would
    // report a monthly spend a fraction of the truth.
    expect(data.monthlyAverage).toBeCloseTo(150);
  });

  it('still counts a zero month that falls between two active ones', () => {
    const data = buildAnalytics(
      [row('2026-05', 'Transport', 300), row('2026-07', 'Transport', 300)],
      now,
    );

    // May, June (nothing spent) and July → 600 / 3.
    expect(data.monthlyAverage).toBeCloseTo(200);
    expect(data.completeMonthCount).toBe(3);
  });

  it('has no average until a month has finished', () => {
    const data = buildAnalytics([row('2026-08', 'Transport', 400)], now);

    expect(data.monthlyAverage).toBeNull();
    expect(data.completeMonthCount).toBe(0);
  });

  it('totals the calendar year to date', () => {
    const data = buildAnalytics(
      [
        row('2025-11', 'Transport', 1000),
        row('2026-01', 'Transport', 10),
        row('2026-08', 'Transport', 5),
      ],
      now,
    );

    expect(data.yearTotal).toBe(15);
    expect(data.year).toBe(2026);
  });

  it('finds the busiest month', () => {
    const data = buildAnalytics(
      [
        row('2026-05', 'Transport', 100),
        row('2026-06', 'Transport', 900),
        row('2026-07', 'Transport', 300),
      ],
      now,
    );

    expect(data.busiestMonth?.month).toBe('2026-06');
    expect(data.busiestMonth?.total).toBe(900);
  });

  it('ranks category trends by total and keeps the series aligned', () => {
    const data = buildAnalytics(
      [
        row('2026-06', 'Transport', 100),
        row('2026-07', 'Transport', 100),
        row('2026-06', 'Locuință & Facturi', 500),
      ],
      now,
    );

    expect(data.categoryTrends.map((t) => t.category)).toEqual(['Locuință & Facturi', 'Transport']);

    const transport = data.categoryTrends.find((t) => t.category === 'Transport')!;
    expect(transport.monthly).toHaveLength(12);
    expect(transport.monthly[data.months.indexOf('2026-06')]).toBe(100);
    expect(transport.monthly[data.months.indexOf('2026-08')]).toBe(0);
  });

  it('buckets an unknown or missing category into Altele', () => {
    const data = buildAnalytics([row('2026-07', 'Criptomonede', 10), row('2026-07', null, 5)], now);

    expect(data.categoryTrends).toHaveLength(1);
    expect(data.categoryTrends[0].category).toBe('Altele');
    expect(data.categoryTrends[0].total).toBe(15);
  });

  it('measures a category against its own earlier months', () => {
    const data = buildAnalytics(
      [
        row('2026-05', 'Transport', 100),
        row('2026-06', 'Transport', 100),
        row('2026-07', 'Transport', 200),
      ],
      now,
    );

    // Latest complete month (July, 200) vs. the mean of May and June (100).
    expect(data.categoryTrends[0].changePercent).toBeCloseTo(100);
  });

  it('has no change figure from a single complete month or a zero baseline', () => {
    const single = buildAnalytics([row('2026-07', 'Transport', 200)], now);
    expect(single.categoryTrends[0].changePercent).toBeNull();

    const fromNothing = buildAnalytics(
      [row('2026-06', 'Locuință & Facturi', 10), row('2026-07', 'Transport', 200)],
      now,
    );
    // Transport starts in July: its June baseline is 0, and 0 → 200 is not a
    // percentage increase.
    const transport = fromNothing.categoryTrends.find((t) => t.category === 'Transport')!;
    expect(transport.changePercent).toBeNull();
  });

  it('ignores rows outside the rendered window', () => {
    const data = buildAnalytics(
      [row('2020-01', 'Transport', 9999), row('2026-07', 'Transport', 10)],
      now,
    );

    expect(data.windowTotal).toBe(10);
  });

  it('is empty but well-formed with no data at all', () => {
    const data = buildAnalytics([], now);

    expect(data.windowTotal).toBe(0);
    expect(data.monthlyAverage).toBeNull();
    expect(data.busiestMonth).toBeNull();
    expect(data.categoryTrends).toEqual([]);
    expect(data.yearTotal).toBe(0);
  });
});
