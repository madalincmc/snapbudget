import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildPeriodData,
  customPeriod,
  daysBetween,
  daysRange,
  monthPeriod,
  type ReceiptRow,
} from '@/lib/dashboard/aggregate';
import { MAX_CUSTOM_DAYS, periodFetchRange, periodFromParams } from '@/lib/dashboard/period';

const now = new Date(2026, 7, 15); // 15 August 2026

function row(day: string, amount: number, category = 'Transport'): ReceiptRow {
  return {
    id: `${day}-${amount}`,
    user_id: 'u1',
    merchant: `M${amount}`,
    amount,
    purchase_date: day,
    category,
    subcategory: null,
    status: 'processed',
    source: 'manual',
    created_at: `${day}T10:00:00.000Z`,
  };
}

describe('day arithmetic', () => {
  it('counts both ends of an interval', () => {
    expect(daysBetween('2026-08-15', '2026-08-15')).toBe(1);
    expect(daysBetween('2026-07-15', '2026-08-15')).toBe(32);
  });

  it('steps across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('lists every day of an interval, oldest first', () => {
    expect(daysRange('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ]);
  });
});

describe('customPeriod', () => {
  it('takes the interval as given, both ends included', () => {
    const period = customPeriod('2026-07-15', '2026-08-15', now);
    expect(period).toMatchObject({ kind: 'custom', from: '2026-07-15', to: '2026-08-15' });
    expect(period.month).toBeNull();
  });

  it('reads an interval drawn back to front the way it was meant', () => {
    expect(customPeriod('2026-08-15', '2026-07-15', now)).toMatchObject({
      from: '2026-07-15',
      to: '2026-08-15',
    });
  });

  it('compares against the same length of time immediately before', () => {
    const period = customPeriod('2026-07-15', '2026-08-15', now);

    expect(period.previousTo).toBe('2026-07-14');
    expect(daysBetween(period.previousFrom, period.previousTo)).toBe(
      daysBetween(period.from, period.to),
    );
  });

  it('divides a running window by the days it has had, not the days it will have', () => {
    // 1–31 August, asked on the 15th.
    expect(customPeriod('2026-08-01', '2026-08-31', now).days).toBe(15);
  });

  it('divides a finished window by its whole length', () => {
    expect(customPeriod('2026-06-01', '2026-06-30', now).days).toBe(30);
  });

  it('knows whether the window is still running', () => {
    expect(customPeriod('2026-08-01', '2026-08-31', now).isLive).toBe(true);
    expect(customPeriod('2026-06-01', '2026-06-30', now).isLive).toBe(false);
  });

  it('charts exactly the days it covers', () => {
    const period = customPeriod('2026-08-10', '2026-08-14', now);
    expect(period.trendDays).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
    ]);
  });
});

describe('monthPeriod', () => {
  it('covers the whole month and compares against the whole month before', () => {
    expect(monthPeriod('2026-08', now)).toMatchObject({
      kind: 'month',
      month: '2026-08',
      from: '2026-08-01',
      to: '2026-08-31',
      previousFrom: '2026-07-01',
      previousTo: '2026-07-31',
      isLive: true,
    });
  });

  it('steps back over a year boundary', () => {
    expect(monthPeriod('2026-01', now)).toMatchObject({
      previousFrom: '2025-12-01',
      previousTo: '2025-12-31',
    });
  });

  it('keeps the live month on a trailing thirty days, spanning the boundary', () => {
    const period = monthPeriod('2026-08', now);
    expect(period.trendDays).toHaveLength(30);
    expect(period.trendDays[0]).toBe('2026-07-17');
    expect(period.trendDays[29]).toBe('2026-08-15');
  });

  it('charts a finished month over its own days', () => {
    const period = monthPeriod('2026-06', now);
    expect(period.trendDays).toHaveLength(30);
    expect(period.trendDays[0]).toBe('2026-06-01');
    expect(period.isLive).toBe(false);
  });
});

describe('buildPeriodData over a custom interval', () => {
  const rows = [
    row('2026-07-14', 100), // the day before — belongs to the comparison
    row('2026-07-15', 10), // first day in
    row('2026-08-01', 20, 'Sănătate & Îngrijire'),
    row('2026-08-15', 30), // last day in
    row('2026-08-16', 999), // the day after — out
  ];
  const period = customPeriod('2026-07-15', '2026-08-15', now);
  const data = buildPeriodData(rows, period);

  it('includes both boundary days and excludes the days either side', () => {
    expect(data.total).toBe(60);
  });

  it('breaks the same rows down by category', () => {
    const sum = data.categoryTotals.reduce((s, c) => s + c.total, 0);
    expect(sum).toBe(data.total);
    expect(data.categoryTotals.find((c) => c.category === 'Transport')?.total).toBe(40);
  });

  it('takes the top category and biggest expense from inside the window only', () => {
    expect(data.topCategory?.category).toBe('Transport');
    expect(data.biggestExpense?.amount).toBe(30);
  });

  it('compares against the preceding window of the same length', () => {
    expect(data.comparison.previousTotal).toBe(100);
    expect(data.comparison.direction).toBe('down');
  });

  it('charts one column per day of the window', () => {
    expect(data.dailyTrend).toHaveLength(32);
    expect(data.dailyTrend[0]).toEqual({ date: '2026-07-15', total: 10 });
    expect(data.dailyTrend[31]).toEqual({ date: '2026-08-15', total: 30 });
  });

  it('averages over the days the window has had', () => {
    // Runs to today, so 15 July to 15 August is 32 elapsed days.
    expect(data.avgDailySpend).toBeCloseTo(60 / 32);
  });

  it('agrees with the month path when the interval happens to be a month', () => {
    const asRange = buildPeriodData(rows, customPeriod('2026-08-01', '2026-08-31', now));
    const asMonth = buildPeriodData(rows, monthPeriod('2026-08', now));

    expect(asRange.total).toBe(asMonth.total);
    expect(asRange.categoryTotals).toEqual(asMonth.categoryTotals);
    expect(asRange.comparison.previousTotal).toBe(asMonth.comparison.previousTotal);
  });
});

describe('periodFromParams', () => {
  it('takes a well-formed interval', () => {
    expect(periodFromParams({ from: '2026-07-15', to: '2026-08-15' }, now)).toMatchObject({
      kind: 'custom',
      from: '2026-07-15',
      to: '2026-08-15',
    });
  });

  it('falls back to the current month on anything it cannot use', () => {
    const cases = [
      {},
      { from: '2026-07-15' }, // one end only
      { from: 'ieri', to: 'azi' },
      { from: '2026-02-31', to: '2026-03-05' }, // not a real date
      { from: '2027-01-01', to: '2027-01-10' }, // entirely ahead of today
    ];

    for (const params of cases) {
      expect(periodFromParams(params, now), JSON.stringify(params)).toMatchObject({
        kind: 'month',
        month: '2026-08',
      });
    }
  });

  it('refuses an interval longer than the chart can draw', () => {
    const tooLong = { from: '2026-01-01', to: '2026-08-15' };
    expect(periodFromParams(tooLong, now).kind).toBe('month');

    const atTheLimit = { from: addDays('2026-08-15', -(MAX_CUSTOM_DAYS - 1)), to: '2026-08-15' };
    expect(periodFromParams(atTheLimit, now).kind).toBe('custom');
  });

  it('lets an interval win over a month parameter left in the URL', () => {
    expect(
      periodFromParams({ month: '2026-06', from: '2026-07-15', to: '2026-08-15' }, now),
    ).toMatchObject({ kind: 'custom' });
  });

  it('still honours a month, and rejects a future one', () => {
    expect(periodFromParams({ month: '2026-06' }, now).month).toBe('2026-06');
    expect(periodFromParams({ month: '2026-12' }, now).month).toBe('2026-08');
  });
});

describe('periodFetchRange', () => {
  it('reaches back far enough for the comparison window', () => {
    const { from, to } = periodFetchRange(customPeriod('2026-07-15', '2026-08-15', now));

    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(5); // June — 32 days before 15 July
    expect(from.getDate()).toBe(13);
    // Exclusive upper bound, so the last day in the window is still fetched.
    expect(to.getDate()).toBe(16);
    expect(to.getMonth()).toBe(7);
  });

  it("reaches back for a live month's trailing chart, which starts before its comparison ends", () => {
    const { from } = periodFetchRange(monthPeriod('2026-08', now));
    // The comparison month starts 1 July, before the chart's 17 July.
    expect(from.getMonth()).toBe(6);
    expect(from.getDate()).toBe(1);
  });
});
