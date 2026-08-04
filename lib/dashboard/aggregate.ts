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
  /** Daily totals for the last 30 days (oldest first), zero-filled for days with no spending. */
  dailyTrend: DailySpend[];
}

/** Reads the year/month out of a "YYYY-MM-DD" or ISO timestamp string without
 * going through Date's local-timezone conversion (which can roll UTC
 * midnight back a day depending on server TZ). */
function yearMonthOf(dateStr: string): [number, number] {
  const [year, month] = dateStr.split('-');
  return [Number(year), Number(month) - 1];
}

function dayKeyOf(receipt: ReceiptRow): string {
  return (receipt.purchase_date ?? receipt.created_at).slice(0, 10);
}

/** Formats a local Date as "YYYY-MM-DD", matching the DB's date-string format. */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Earliest date the dashboard needs data for: covers both the previous
 * month (for the comparison card) and the last 30 days (for the trend chart). */
export function dashboardRangeStart(now = new Date()): Date {
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return startOfPreviousMonth < last30Start ? startOfPreviousMonth : last30Start;
}

function isSpent(r: ReceiptRow): boolean {
  return r.status === 'processed' && r.amount !== null;
}

export function buildDashboardData(receipts: ReceiptRow[], now = new Date()): DashboardData {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = previousMonthDate.getMonth();

  const monthly = receipts.filter((r) => {
    if (!isSpent(r)) return false;
    const [year, month] = yearMonthOf(dayKeyOf(r));
    return year === currentYear && month === currentMonth;
  });

  const previousMonthly = receipts.filter((r) => {
    if (!isSpent(r)) return false;
    const [year, month] = yearMonthOf(dayKeyOf(r));
    return year === previousYear && month === previousMonth;
  });

  const monthTotal = monthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const previousTotal = previousMonthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const hasPreviousData = previousMonthly.length > 0;
  const percentChange =
    hasPreviousData && previousTotal > 0 ? ((monthTotal - previousTotal) / previousTotal) * 100 : null;
  const direction: MonthComparison['direction'] =
    percentChange === null ? 'flat' : percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'flat';

  const totals = new Map<Category, number>(CATEGORIES.map((category) => [category, 0]));
  for (const r of monthly) {
    const category = isCategory(r.category) ? r.category : 'Altele';
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

  const daysElapsed = now.getDate();
  const avgDailySpend = daysElapsed > 0 ? monthTotal / daysElapsed : 0;

  const dailyTrendMap = new Map<string, number>();
  const orderedDays: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = toDateString(new Date(currentYear, currentMonth, now.getDate() - i));
    dailyTrendMap.set(key, 0);
    orderedDays.push(key);
  }
  for (const r of receipts) {
    if (!isSpent(r)) continue;
    const key = dayKeyOf(r);
    if (dailyTrendMap.has(key)) {
      dailyTrendMap.set(key, (dailyTrendMap.get(key) ?? 0) + (r.amount ?? 0));
    }
  }
  const dailyTrend = orderedDays.map((date) => ({ date, total: dailyTrendMap.get(date) ?? 0 }));

  return {
    monthTotal,
    categoryTotals,
    comparison: { currentTotal: monthTotal, previousTotal, percentChange, hasPreviousData, direction },
    topCategory,
    biggestExpense,
    avgDailySpend,
    dailyTrend,
  };
}
