import { isCategory, type Category } from '@/lib/categories';
import { monthKeyOf, recentMonthKeys, type MonthKey } from '@/lib/dashboard/aggregate';

/** One (month, category) bucket as returned by the `monthly_spending` RPC. */
export interface MonthlySpendRow {
  month: string;
  category: string | null;
  total: number | string;
}

export interface MonthTotal {
  month: MonthKey;
  total: number;
}

export interface CategoryTrend {
  category: Category;
  /** Total across the whole window. */
  total: number;
  /** One entry per month in `AnalyticsData.months`, zero-filled and aligned by index. */
  monthly: number[];
  /** Latest complete month against the mean of the complete months before it. */
  changePercent: number | null;
}

export interface AnalyticsData {
  /** Oldest first, ending with the month `now` falls in. */
  months: MonthKey[];
  monthTotals: MonthTotal[];
  windowTotal: number;
  /**
   * Mean over *complete* months only. The live month is partial, and including
   * it would drag the reference line down every month and then jump on the 1st.
   * Null until at least one month has finished.
   */
  monthlyAverage: number | null;
  completeMonthCount: number;
  busiestMonth: MonthTotal | null;
  /** Calendar year to date. A 12-month window always contains all of it. */
  yearTotal: number;
  year: number;
  /** Sorted by window total, descending; categories with no spending are dropped. */
  categoryTrends: CategoryTrend[];
}

function categoryOf(raw: string | null): Category {
  return isCategory(raw) ? raw : 'Altele';
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Months that count toward an average: complete (not the live one) and at or
 * after the first month with any spending. Without the second condition a new
 * account averages its three real months across all twelve and reports a
 * monthly spend roughly a quarter of the truth.
 */
function completeIndices(
  months: MonthKey[],
  monthTotals: MonthTotal[],
  currentMonth: MonthKey,
): number[] {
  const firstWithData = monthTotals.findIndex((m) => m.total > 0);
  if (firstWithData === -1) return [];

  const indices: number[] = [];
  for (let i = firstWithData; i < months.length; i++) {
    if (months[i] !== currentMonth) indices.push(i);
  }
  return indices;
}

export function buildAnalytics(
  rows: MonthlySpendRow[],
  now = new Date(),
  monthCount = 12,
): AnalyticsData {
  const months = recentMonthKeys(monthCount, now);
  const currentMonth = monthKeyOf(now);
  const indexOfMonth = new Map(months.map((m, i) => [m, i]));

  const totalsByMonth = new Array<number>(months.length).fill(0);
  const byCategory = new Map<Category, number[]>();

  for (const row of rows) {
    const index = indexOfMonth.get(row.month);
    // Rows outside the window are ignored rather than trusted: the RPC is
    // range-bounded, but the window here is what the UI actually renders.
    if (index === undefined) continue;

    const amount = Number(row.total);
    if (!Number.isFinite(amount)) continue;

    totalsByMonth[index] += amount;

    const category = categoryOf(row.category);
    let series = byCategory.get(category);
    if (!series) {
      series = new Array<number>(months.length).fill(0);
      byCategory.set(category, series);
    }
    series[index] += amount;
  }

  const monthTotals: MonthTotal[] = months.map((month, i) => ({ month, total: totalsByMonth[i] }));
  const windowTotal = totalsByMonth.reduce((sum, t) => sum + t, 0);

  const complete = completeIndices(months, monthTotals, currentMonth);
  const monthlyAverage = mean(complete.map((i) => totalsByMonth[i]));

  const busiestMonth = monthTotals.reduce<MonthTotal | null>((best, m) => {
    if (m.total <= 0) return best;
    return !best || m.total > best.total ? m : best;
  }, null);

  const year = now.getFullYear();
  const yearPrefix = `${year}-`;
  const yearTotal = monthTotals
    .filter((m) => m.month.startsWith(yearPrefix))
    .reduce((sum, m) => sum + m.total, 0);

  const categoryTrends: CategoryTrend[] = [...byCategory.entries()]
    .map(([category, monthly]) => ({
      category,
      monthly,
      total: monthly.reduce((sum, v) => sum + v, 0),
      changePercent: changeOf(monthly, complete),
    }))
    .filter((trend) => trend.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    months,
    monthTotals,
    windowTotal,
    monthlyAverage,
    completeMonthCount: complete.length,
    busiestMonth,
    yearTotal,
    year,
    categoryTrends,
  };
}

/**
 * "Is this creeping up?" — the latest finished month against the mean of the
 * finished months before it. Needs at least two complete months, and a
 * non-zero baseline: going from nothing to something is not a percentage.
 */
function changeOf(monthly: number[], complete: number[]): number | null {
  if (complete.length < 2) return null;

  const latest = monthly[complete[complete.length - 1]];
  const baseline = mean(complete.slice(0, -1).map((i) => monthly[i]));

  if (baseline === null || baseline <= 0) return null;
  return ((latest - baseline) / baseline) * 100;
}
