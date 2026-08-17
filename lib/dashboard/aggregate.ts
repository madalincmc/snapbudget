import { CATEGORIES, isCategory, type Category } from '@/lib/categories';

export interface ReceiptRow {
  id: string;
  user_id: string;
  merchant: string | null;
  amount: number | null;
  purchase_date: string | null;
  category: string | null;
  subcategory: string | null;
  status: string;
  source: string;
  created_at: string;
}

export interface CategoryTotal {
  category: Category;
  total: number;
}

export interface MonthComparison {
  currentTotal: number;
  previousTotal: number;
  /** null when there's no previous-month data to compare against (e.g. new accounts). */
  percentChange: number | null;
  hasPreviousData: boolean;
  direction: 'up' | 'down' | 'flat';
}

export interface BiggestExpense {
  merchant: string;
  amount: number;
}

export interface DailySpend {
  date: string;
  total: number;
}

export interface DashboardData {
  total: number;
  categoryTotals: CategoryTotal[];
  comparison: MonthComparison;
  topCategory: CategoryTotal | null;
  biggestExpense: BiggestExpense | null;
  avgDailySpend: number;
  /** Zero-filled daily totals over the period's charted days. */
  dailyTrend: DailySpend[];
  /** Whether the period is still running — drives "so far" vs. final wording. */
  isLive: boolean;
}

/**
 * "YYYY-MM". Used as the canonical handle for a period because it is what the
 * URL carries, what Postgres returns from `to_char(..., 'YYYY-MM')`, and what
 * a date string starts with — so bucketing is a string compare with no
 * timezone conversion and no 0-vs-1-indexed month to get wrong.
 */
export type MonthKey = string;

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** First day of the month, in local time. */
export function monthKeyToDate(key: MonthKey): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/** Shifts by whole months; Date normalises the overflow, so -1 from January is December. */
export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const date = monthKeyToDate(key);
  return monthKeyOf(new Date(date.getFullYear(), date.getMonth() + delta, 1));
}

export function daysInMonthKey(key: MonthKey): number {
  const date = monthKeyToDate(key);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** The `count` months ending with (and including) the month of `now`, oldest first. */
export function recentMonthKeys(count: number, now = new Date()): MonthKey[] {
  const latest = monthKeyOf(now);
  return Array.from({ length: count }, (_, i) => shiftMonthKey(latest, i - (count - 1)));
}

/** The day a row belongs to — purchase_date when it has one, else the day it
 *  was entered. Manual and backdated rows can have no purchase_date. */
export function receiptDay(receipt: ReceiptRow): string {
  return (receipt.purchase_date ?? receipt.created_at).slice(0, 10);
}

/** The month a row belongs to — the same fallback the rest of the app uses. */
export function receiptMonth(receipt: ReceiptRow): MonthKey {
  return receiptDay(receipt).slice(0, 7);
}

/** The bucket a row is charted under. Anything unset or no longer a category
 *  falls into "Altele", so a total never silently loses rows. */
export function receiptCategory(receipt: ReceiptRow): Category {
  return isCategory(receipt.category) ? receipt.category : 'Altele';
}

/** Formats a local Date as "YYYY-MM-DD", matching the DB's date-string format. */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The rows a dashboard view needs: the selected month, the one before it for
 * the comparison card, and — for the current month — the trailing 30 days,
 * which can start before the previous month does.
 *
 * `to` is exclusive.
 */
export function dashboardRange(month: MonthKey, now = new Date()): { from: Date; to: Date } {
  const selected = monthKeyToDate(month);
  const previousStart = new Date(selected.getFullYear(), selected.getMonth() - 1, 1);
  const nextStart = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);

  if (month !== monthKeyOf(now)) {
    return { from: previousStart, to: nextStart };
  }

  const last30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return {
    from: previousStart < last30Start ? previousStart : last30Start,
    to: nextStart,
  };
}

/** Whether a row is money actually spent: processed, and with an amount on it. */
export function isSpent(r: ReceiptRow): boolean {
  return r.status === 'processed' && r.amount !== null;
}

/* -------------------------------------------------------------------------- */
/* Period                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The window every figure on a dashboard is measured over.
 *
 * One shape for both a month and an arbitrary interval, so the two cannot end
 * up computed by different code — the whole point being that the total, the
 * breakdown, the chart and the comparison always describe the same days.
 * A month is just the constructor that fills this in with month boundaries.
 */
export interface DashboardPeriod {
  kind: 'month' | 'custom';
  /** Inclusive day bounds, "YYYY-MM-DD". */
  from: string;
  to: string;
  /** The window the comparison measures against — same length, immediately before. */
  previousFrom: string;
  previousTo: string;
  /** What the daily average divides by; a running window counts only elapsed days. */
  days: number;
  /** The days the trend chart plots, oldest first. */
  trendDays: string[];
  /** The window contains today. */
  isLive: boolean;
  /** Set for a month period only — the screens and links still keyed by month. */
  month: MonthKey | null;
}

/**
 * Day arithmetic in UTC, on values that are calendar dates rather than
 * instants: local arithmetic across a DST boundary can land on the same day
 * twice, or skip one.
 */
function dayToUtc(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcToDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;

export function addDays(key: string, delta: number): string {
  return utcToDay(dayToUtc(key) + delta * DAY_MS);
}

/** How many days the interval covers, counting both ends. */
export function daysBetween(from: string, to: string): number {
  return Math.floor((dayToUtc(to) - dayToUtc(from)) / DAY_MS) + 1;
}

/** Every day from `from` to `to`, inclusive, oldest first. */
export function daysRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let ms = dayToUtc(from); ms <= dayToUtc(to); ms += DAY_MS) out.push(utcToDay(ms));
  return out;
}

/**
 * A whole calendar month.
 *
 * The live month keeps the two things that make it read as "so far": a
 * trailing-30-day chart that deliberately spans the month boundary, and an
 * average over elapsed days rather than the days the month will end up having.
 */
export function monthPeriod(month: MonthKey, now = new Date()): DashboardPeriod {
  const start = monthKeyToDate(month);
  const length = daysInMonthKey(month);
  const isCurrentMonth = month === monthKeyOf(now);

  const previous = shiftMonthKey(month, -1);
  const previousStart = monthKeyToDate(previous);

  return {
    kind: 'month',
    month,
    from: toDateString(start),
    to: toDateString(new Date(start.getFullYear(), start.getMonth(), length)),
    previousFrom: toDateString(previousStart),
    previousTo: toDateString(
      new Date(previousStart.getFullYear(), previousStart.getMonth(), daysInMonthKey(previous)),
    ),
    days: isCurrentMonth ? now.getDate() : length,
    trendDays: monthTrendDays(month, now),
    isLive: isCurrentMonth,
  };
}

/**
 * An interval the reader drew themselves.
 *
 * Compared against the stretch of the same length immediately before it, which
 * is what "previous month" already means for a month and the only reading that
 * holds for a fortnight or a holiday.
 */
export function customPeriod(fromKey: string, toKey: string, now = new Date()): DashboardPeriod {
  // Drawn back to front is a slip, not a request for nothing.
  const [from, to] = fromKey <= toKey ? [fromKey, toKey] : [toKey, fromKey];

  const length = daysBetween(from, to);
  const previousTo = addDays(from, -1);
  const today = toDateString(now);
  const isLive = from <= today && today <= to;

  return {
    kind: 'custom',
    month: null,
    from,
    to,
    previousFrom: addDays(previousTo, -(length - 1)),
    previousTo,
    days: isLive ? daysBetween(from, today) : length,
    trendDays: daysRange(from, to),
    isLive,
  };
}

/** The days the trend chart plots for a month — see buildDailyTrend. */
function monthTrendDays(month: MonthKey, now: Date): string[] {
  if (month === monthKeyOf(now)) {
    return Array.from({ length: 30 }, (_, i) =>
      toDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i))),
    );
  }

  const start = monthKeyToDate(month);
  return Array.from({ length: daysInMonthKey(month) }, (_, i) =>
    toDateString(new Date(start.getFullYear(), start.getMonth(), i + 1)),
  );
}

/**
 * Aggregates one month's view — the period constructor plus the shared core,
 * so a month and a custom interval are the same computation over different
 * bounds rather than two implementations that can drift.
 */
export function buildDashboardData(
  receipts: ReceiptRow[],
  month: MonthKey = monthKeyOf(new Date()),
  now = new Date(),
): DashboardData {
  return buildPeriodData(receipts, monthPeriod(month, now));
}

/** Rows whose day falls inside the window, both ends included. */
function within(receipts: ReceiptRow[], from: string, to: string): ReceiptRow[] {
  return receipts.filter((r) => {
    if (!isSpent(r)) return false;
    const day = receiptDay(r);
    return day >= from && day <= to;
  });
}

/**
 * Every figure the dashboard shows, over one period.
 *
 * Bounds only — nothing in here knows what a month is. That is what keeps the
 * total, the breakdown, the chart and the comparison describing the same days
 * whichever way the period was chosen.
 */
export function buildPeriodData(receipts: ReceiptRow[], period: DashboardPeriod): DashboardData {
  const current = within(receipts, period.from, period.to);
  const previous = within(receipts, period.previousFrom, period.previousTo);

  const total = current.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const previousTotal = previous.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const hasPreviousData = previous.length > 0;
  const percentChange =
    hasPreviousData && previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const direction: MonthComparison['direction'] =
    percentChange === null
      ? 'flat'
      : percentChange > 0
        ? 'up'
        : percentChange < 0
          ? 'down'
          : 'flat';

  const totals = new Map<Category, number>(CATEGORIES.map((category) => [category, 0]));
  for (const r of current) {
    const category = receiptCategory(r);
    totals.set(category, (totals.get(category) ?? 0) + (r.amount ?? 0));
  }

  const categoryTotals = CATEGORIES.map((category) => ({
    category,
    total: totals.get(category) ?? 0,
  }));

  const topCategory = categoryTotals.reduce<CategoryTotal | null>((top, c) => {
    if (c.total <= 0) return top;
    if (!top || c.total > top.total) return c;
    return top;
  }, null);

  const biggestExpense = current.reduce<BiggestExpense | null>((biggest, r) => {
    if (r.amount === null) return biggest;
    if (!biggest || r.amount > biggest.amount) {
      return { merchant: r.merchant ?? 'Comerciant necunoscut', amount: r.amount };
    }
    return biggest;
  }, null);

  return {
    total,
    categoryTotals,
    comparison: {
      currentTotal: total,
      previousTotal,
      percentChange,
      hasPreviousData,
      direction,
    },
    topCategory,
    biggestExpense,
    avgDailySpend: period.days > 0 ? total / period.days : 0,
    dailyTrend: trendOverDays(receipts, period.trendDays),
    isLive: period.isLive,
  };
}

/** Zero-filled totals for exactly these days, in the order given. */
export function trendOverDays(receipts: ReceiptRow[], days: string[]): DailySpend[] {
  const totals = new Map(days.map((day) => [day, 0]));

  for (const r of receipts) {
    if (!isSpent(r)) continue;
    const key = receiptDay(r);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + (r.amount ?? 0));
  }

  return days.map((date) => ({ date, total: totals.get(date) ?? 0 }));
}

/**
 * Zero-filled daily totals for one period.
 *
 * The live month keeps its trailing-30-day window, which deliberately spans two
 * calendar months so recent behaviour stays visible across the boundary. A
 * finished month has no "trailing" to speak of, so it charts its own days.
 *
 * Exported because the category screen charts the same window over a subset of
 * the same rows — reusing this is what makes its chart line up, day for day,
 * with the dashboard's.
 */
export function buildDailyTrend(
  receipts: ReceiptRow[],
  month: MonthKey,
  now = new Date(),
): DailySpend[] {
  return trendOverDays(receipts, monthTrendDays(month, now));
}
