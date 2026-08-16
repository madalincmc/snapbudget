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
  monthTotal: number;
  categoryTotals: CategoryTotal[];
  comparison: MonthComparison;
  topCategory: CategoryTotal | null;
  biggestExpense: BiggestExpense | null;
  avgDailySpend: number;
  /** Zero-filled daily totals: a rolling 30 days for the current month, or every day of a past one. */
  dailyTrend: DailySpend[];
  /** Whether the selected period is the month `now` falls in — drives "so far" vs. final wording. */
  isCurrentMonth: boolean;
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

/**
 * Aggregates one month's view. `month` selects the period; `now` is only used
 * to tell a live month from a finished one — which changes two things:
 * the daily chart window, and whether the average is per elapsed day or per
 * day of the whole month. Dividing a finished month by its elapsed days would
 * report every past month as if it ended today.
 */
export function buildDashboardData(
  receipts: ReceiptRow[],
  month: MonthKey = monthKeyOf(new Date()),
  now = new Date(),
): DashboardData {
  const previousMonth = shiftMonthKey(month, -1);
  const isCurrentMonth = month === monthKeyOf(now);

  const monthly = receipts.filter((r) => isSpent(r) && receiptMonth(r) === month);
  const previousMonthly = receipts.filter((r) => isSpent(r) && receiptMonth(r) === previousMonth);

  const monthTotal = monthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const previousTotal = previousMonthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const hasPreviousData = previousMonthly.length > 0;
  const percentChange =
    hasPreviousData && previousTotal > 0
      ? ((monthTotal - previousTotal) / previousTotal) * 100
      : null;
  const direction: MonthComparison['direction'] =
    percentChange === null
      ? 'flat'
      : percentChange > 0
        ? 'up'
        : percentChange < 0
          ? 'down'
          : 'flat';

  const totals = new Map<Category, number>(CATEGORIES.map((category) => [category, 0]));
  for (const r of monthly) {
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

  const biggestExpense = monthly.reduce<BiggestExpense | null>((biggest, r) => {
    if (r.amount === null) return biggest;
    if (!biggest || r.amount > biggest.amount) {
      return { merchant: r.merchant ?? 'Comerciant necunoscut', amount: r.amount };
    }
    return biggest;
  }, null);

  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonthKey(month);
  const avgDailySpend = daysElapsed > 0 ? monthTotal / daysElapsed : 0;

  const dailyTrend = buildDailyTrend(receipts, month, now);

  return {
    monthTotal,
    categoryTotals,
    comparison: {
      currentTotal: monthTotal,
      previousTotal,
      percentChange,
      hasPreviousData,
      direction,
    },
    topCategory,
    biggestExpense,
    avgDailySpend,
    dailyTrend,
    isCurrentMonth,
  };
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
  const isCurrentMonth = month === monthKeyOf(now);
  const orderedDays: string[] = [];

  if (isCurrentMonth) {
    for (let i = 29; i >= 0; i--) {
      orderedDays.push(
        toDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)),
      );
    }
  } else {
    const start = monthKeyToDate(month);
    for (let day = 1; day <= daysInMonthKey(month); day++) {
      orderedDays.push(toDateString(new Date(start.getFullYear(), start.getMonth(), day)));
    }
  }

  const totals = new Map(orderedDays.map((day) => [day, 0]));
  for (const r of receipts) {
    if (!isSpent(r)) continue;
    const key = receiptDay(r);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + (r.amount ?? 0));
    }
  }

  return orderedDays.map((date) => ({ date, total: totals.get(date) ?? 0 }));
}
