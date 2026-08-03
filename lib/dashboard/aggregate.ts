import { CATEGORIES, isCategory, type Category } from '@/lib/categories';

export interface ReceiptRow {
  id: string;
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

export interface DashboardData {
  monthTotal: number;
  categoryTotals: CategoryTotal[];
  latest: ReceiptRow[];
}

/** Reads the year/month out of a "YYYY-MM-DD" or ISO timestamp string without
 * going through Date's local-timezone conversion (which can roll UTC
 * midnight back a day depending on server TZ). */
function yearMonthOf(dateStr: string): [number, number] {
  const [year, month] = dateStr.split('-');
  return [Number(year), Number(month) - 1];
}

export function buildDashboardData(receipts: ReceiptRow[], now = new Date()): DashboardData {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthly = receipts.filter((r) => {
    if (r.status !== 'processed' || r.amount === null) return false;
    const [year, month] = yearMonthOf(r.purchase_date ?? r.created_at);
    return year === currentYear && month === currentMonth;
  });

  const monthTotal = monthly.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const totals = new Map<Category, number>(CATEGORIES.map((category) => [category, 0]));
  for (const r of monthly) {
    const category = isCategory(r.category) ? r.category : 'Altele';
    totals.set(category, (totals.get(category) ?? 0) + (r.amount ?? 0));
  }

  const categoryTotals = CATEGORIES.map((category) => ({
    category,
    total: totals.get(category) ?? 0,
  }));

  return { monthTotal, categoryTotals, latest: receipts.slice(0, 10) };
}
