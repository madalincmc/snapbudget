import { describe, expect, it } from 'vitest';
import {
  buildDailyTrend,
  buildDashboardData,
  dashboardRange,
  daysInMonthKey,
  isMonthKey,
  monthKeyOf,
  receiptCategory,
  recentMonthKeys,
  shiftMonthKey,
  toDateString,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';

/** Minimal processed expense; only the fields the aggregation reads. */
function expense(partial: Partial<ReceiptRow> & { amount: number }): ReceiptRow {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'user-1',
    merchant: 'Test',
    purchase_date: '2026-08-10',
    category: 'Transport',
    subcategory: null,
    status: 'processed',
    source: 'manual',
    created_at: '2026-08-10T09:00:00.000Z',
    ...partial,
  };
}

describe('month keys', () => {
  it('formats and pads', () => {
    expect(monthKeyOf(new Date(2026, 0, 15))).toBe('2026-01');
    expect(monthKeyOf(new Date(2026, 11, 1))).toBe('2026-12');
  });

  it('shifts across year boundaries in both directions', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-03', -14)).toBe('2025-01');
  });

  it('knows month lengths, including leap February', () => {
    expect(daysInMonthKey('2026-02')).toBe(28);
    expect(daysInMonthKey('2028-02')).toBe(29);
    expect(daysInMonthKey('2026-04')).toBe(30);
    expect(daysInMonthKey('2026-12')).toBe(31);
  });

  it('validates shape', () => {
    expect(isMonthKey('2026-08')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-00')).toBe(false);
    expect(isMonthKey('2026-8')).toBe(false);
    expect(isMonthKey('august')).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });

  it('lists recent months oldest first, ending with now', () => {
    expect(recentMonthKeys(3, new Date(2026, 0, 20))).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('buildDashboardData', () => {
  const now = new Date(2026, 7, 11); // 11 August 2026

  it('totals only the selected month', () => {
    const data = buildDashboardData(
      [
        expense({ amount: 100, purchase_date: '2026-08-03' }),
        expense({ amount: 50, purchase_date: '2026-08-29' }),
        expense({ amount: 999, purchase_date: '2026-07-15' }),
      ],
      '2026-08',
      now,
    );

    expect(data.monthTotal).toBe(150);
    expect(data.comparison.previousTotal).toBe(999);
  });

  it('aggregates a past month without leaking the current one', () => {
    const data = buildDashboardData(
      [
        expense({ amount: 100, purchase_date: '2026-08-03' }),
        expense({ amount: 40, purchase_date: '2026-07-15' }),
        expense({ amount: 60, purchase_date: '2026-06-15' }),
      ],
      '2026-07',
      now,
    );

    expect(data.monthTotal).toBe(40);
    expect(data.comparison.previousTotal).toBe(60);
    expect(data.isCurrentMonth).toBe(false);
  });

  it('averages the current month over elapsed days, a past month over all of them', () => {
    const rows = [expense({ amount: 310, purchase_date: '2026-08-02' })];
    const current = buildDashboardData(rows, '2026-08', now);
    // 310 over 11 elapsed days, not over all 31.
    expect(current.avgDailySpend).toBeCloseTo(310 / 11);

    const past = buildDashboardData(
      [expense({ amount: 310, purchase_date: '2026-07-02' })],
      '2026-07',
      now,
    );
    // A finished month is divided by its own length, not by today's date.
    expect(past.avgDailySpend).toBeCloseTo(310 / 31);
  });

  it('charts a rolling 30 days for the live month and the whole of a past one', () => {
    const current = buildDashboardData([], '2026-08', now);
    expect(current.dailyTrend).toHaveLength(30);
    expect(current.dailyTrend.at(-1)!.date).toBe(toDateString(now));

    const past = buildDashboardData([], '2026-06', now);
    expect(past.dailyTrend).toHaveLength(30); // June
    expect(past.dailyTrend[0].date).toBe('2026-06-01');
    expect(past.dailyTrend.at(-1)!.date).toBe('2026-06-30');

    const february = buildDashboardData([], '2026-02', now);
    expect(february.dailyTrend).toHaveLength(28);
  });

  it('falls back to created_at when an expense has no purchase date', () => {
    const data = buildDashboardData(
      [expense({ amount: 25, purchase_date: null, created_at: '2026-08-04T22:00:00.000Z' })],
      '2026-08',
      now,
    );

    expect(data.monthTotal).toBe(25);
    expect(data.dailyTrend.find((d) => d.date === '2026-08-04')?.total).toBe(25);
  });

  it('ignores unprocessed rows and rows without an amount', () => {
    const data = buildDashboardData(
      [
        expense({ amount: 100 }),
        expense({ amount: 100, status: 'pending' }),
        { ...expense({ amount: 0 }), amount: null },
      ],
      '2026-08',
      now,
    );

    expect(data.monthTotal).toBe(100);
  });

  it('buckets an unknown category into Altele', () => {
    const data = buildDashboardData(
      [expense({ amount: 70, category: 'Criptomonede' })],
      '2026-08',
      now,
    );

    expect(data.categoryTotals.find((c) => c.category === 'Altele')?.total).toBe(70);
    expect(data.topCategory?.category).toBe('Altele');
  });

  it('reports an empty month as zero rather than NaN', () => {
    const data = buildDashboardData([], '2026-08', now);

    expect(data.monthTotal).toBe(0);
    expect(data.avgDailySpend).toBe(0);
    expect(data.topCategory).toBeNull();
    expect(data.biggestExpense).toBeNull();
    expect(data.comparison.percentChange).toBeNull();
    expect(data.comparison.hasPreviousData).toBe(false);
  });

  it('leaves percentChange null when the previous month exists but totalled zero', () => {
    const data = buildDashboardData(
      [
        expense({ amount: 100, purchase_date: '2026-08-03' }),
        expense({ amount: 0, purchase_date: '2026-07-03' }),
      ],
      '2026-08',
      now,
    );

    // Rows existed, so there is history — but dividing by a zero baseline is
    // not a percentage.
    expect(data.comparison.hasPreviousData).toBe(true);
    expect(data.comparison.percentChange).toBeNull();
  });

  it('signs the month-over-month direction', () => {
    const up = buildDashboardData(
      [
        expense({ amount: 200, purchase_date: '2026-08-03' }),
        expense({ amount: 100, purchase_date: '2026-07-03' }),
      ],
      '2026-08',
      now,
    );
    expect(up.comparison.percentChange).toBeCloseTo(100);
    expect(up.comparison.direction).toBe('up');

    const down = buildDashboardData(
      [
        expense({ amount: 50, purchase_date: '2026-08-03' }),
        expense({ amount: 100, purchase_date: '2026-07-03' }),
      ],
      '2026-08',
      now,
    );
    expect(down.comparison.percentChange).toBeCloseTo(-50);
    expect(down.comparison.direction).toBe('down');
  });

  it('crosses a year boundary for the comparison', () => {
    const data = buildDashboardData(
      [
        expense({ amount: 10, purchase_date: '2026-01-05' }),
        expense({ amount: 20, purchase_date: '2025-12-31' }),
      ],
      '2026-01',
      new Date(2026, 0, 20),
    );

    expect(data.monthTotal).toBe(10);
    expect(data.comparison.previousTotal).toBe(20);
  });
});

describe('receiptCategory', () => {
  it('buckets anything unset or unrecognised into Altele', () => {
    expect(receiptCategory(expense({ amount: 1, category: 'Transport' }))).toBe('Transport');
    expect(receiptCategory(expense({ amount: 1, category: null }))).toBe('Altele');
    expect(receiptCategory(expense({ amount: 1, category: 'Abonamente' }))).toBe('Altele');
  });
});

describe('buildDailyTrend on a filtered set', () => {
  const now = new Date(2026, 7, 11);

  const rows = [
    expense({ amount: 100, category: 'Transport', purchase_date: '2026-08-03' }),
    expense({ amount: 40, category: 'Transport', purchase_date: '2026-08-03' }),
    expense({ amount: 25, category: 'Mâncare & Băutură', purchase_date: '2026-08-03' }),
    // Outside the month, inside the trailing 30-day window the live month charts.
    expense({ amount: 60, category: 'Transport', purchase_date: '2026-07-20' }),
  ];

  it('charts only the rows it is given', () => {
    const transport = rows.filter((r) => receiptCategory(r) === 'Transport');
    const trend = buildDailyTrend(transport, '2026-08', now);

    expect(trend.find((d) => d.date === '2026-08-03')?.total).toBe(140);
    expect(trend.find((d) => d.date === '2026-07-20')?.total).toBe(60);
  });

  it('agrees with the breakdown total the category screen is opened from', () => {
    // The invariant behind the screen: what the chart adds up to over the month
    // is the number the dashboard row showed for that category.
    const breakdown = buildDashboardData(rows, '2026-08', now).categoryTotals;
    const transportTotal = breakdown.find((c) => c.category === 'Transport')!.total;

    const charted = buildDailyTrend(
      rows.filter((r) => receiptCategory(r) === 'Transport'),
      '2026-08',
      now,
    )
      .filter((d) => d.date.startsWith('2026-08'))
      .reduce((sum, d) => sum + d.total, 0);

    expect(charted).toBe(transportTotal);
    expect(charted).toBe(140);
  });
});

describe('dashboardRange', () => {
  const now = new Date(2026, 7, 11);

  it('covers the previous month and the trailing 30 days for the live month', () => {
    const { from, to } = dashboardRange('2026-08', now);
    expect(toDateString(from)).toBe('2026-07-01');
    expect(toDateString(to)).toBe('2026-09-01');
  });

  it('covers only the selected month and the one before it for a past month', () => {
    const { from, to } = dashboardRange('2026-03', now);
    expect(toDateString(from)).toBe('2026-02-01');
    expect(toDateString(to)).toBe('2026-04-01');
  });

  it('wraps the year correctly', () => {
    const { from, to } = dashboardRange('2026-01', now);
    expect(toDateString(from)).toBe('2025-12-01');
    expect(toDateString(to)).toBe('2026-02-01');
  });
});
