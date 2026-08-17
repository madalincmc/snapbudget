import { isDateKey } from '@/lib/history/date-range';
import {
  customPeriod,
  daysBetween,
  isMonthKey,
  monthKeyOf,
  monthPeriod,
  toDateString,
  type DashboardPeriod,
} from '@/lib/dashboard/aggregate';

/**
 * The longest interval the dashboard will take.
 *
 * Its chart plots one column per day, and past a quarter those columns stop
 * being something anyone can read — a year would draw three hundred hairlines.
 * Longer horizons are what the month arrows are for. A range over the limit
 * falls back to the current month rather than rendering a smear.
 */
export const MAX_CUSTOM_DAYS = 92;

export interface PeriodParams {
  month?: string;
  from?: string;
  to?: string;
}

/**
 * The period a dashboard URL asks for.
 *
 * A custom interval wins over a month when it is one the dashboard can
 * actually draw; everything else — malformed, entirely in the future, longer
 * than the chart can hold — falls back to the month, and a malformed month
 * falls back to the current one. Nothing here throws, because these values
 * come from the address bar.
 *
 * Reuses `isDateKey` from the history filter rather than validating dates a
 * second way: the two screens take the same date format and should agree on
 * what counts as one.
 */
export function periodFromParams(params: PeriodParams, now = new Date()): DashboardPeriod {
  const today = toDateString(now);
  const { from, to } = params;

  if (isDateKey(from) && isDateKey(to)) {
    const [start, end] = from <= to ? [from, to] : [to, from];
    // A window that has not started yet can only be empty, and one longer than
    // the chart holds is not a period anyone reads.
    if (start <= today && daysBetween(start, end) <= MAX_CUSTOM_DAYS) {
      return customPeriod(start, end, now);
    }
  }

  const current = monthKeyOf(now);
  const month = isMonthKey(params.month) && params.month <= current ? params.month : current;
  return monthPeriod(month, now);
}

/**
 * The rows a period's figures need: the window itself, the one it is compared
 * against, and whatever the chart reaches back to. `to` is exclusive, matching
 * `expensesBetween`.
 *
 * Taking the earliest of the three rather than assuming an order — a live
 * month's chart starts before its comparison month does, and a custom window's
 * comparison starts before its chart.
 */
export function periodFetchRange(period: DashboardPeriod): { from: Date; to: Date } {
  const earliest = [period.previousFrom, period.from, period.trendDays[0] ?? period.from].reduce(
    (a, b) => (a < b ? a : b),
  );
  const latest = [period.to, period.trendDays[period.trendDays.length - 1] ?? period.to].reduce(
    (a, b) => (a > b ? a : b),
  );

  return { from: dayToLocalDate(earliest), to: dayToLocalDate(nextDay(latest)) };
}

function nextDay(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" as local midnight — what the query helpers take. */
function dayToLocalDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
