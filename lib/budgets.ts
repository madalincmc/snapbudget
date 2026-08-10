import { isCategory, type Category } from '@/lib/categories';
import type { CategoryTotal } from '@/lib/dashboard/aggregate';

/**
 * Which spending a budget is measured against. Personal budgets count only
 * their owner's expenses; household budgets count everything the household
 * can see — the same two sets the dashboard's "who" filter already switches
 * between, so the limit on screen always matches the total above it.
 */
export type BudgetScope = 'personal' | 'household';

export interface Budget {
  id: string;
  /** Null = the overall budget, covering every category. */
  category: Category | null;
  amount: number;
  householdId: string | null;
}

/** Row shape as returned by Supabase. `amount` is numeric, so it arrives as a string. */
export interface BudgetRow {
  id: string;
  household_id: string | null;
  category: string | null;
  amount: number | string;
}

export type BudgetStatus = 'under' | 'warning' | 'over';

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  /** Negative once the limit is passed — the UI says "depășit cu X". */
  remaining: number;
  /** Uncapped: 130 means 30% over, which the bar renders differently. */
  percentUsed: number;
  /** End-of-month total at the current pace, or null while it means nothing yet. */
  projected: number | null;
  status: BudgetStatus;
}

export interface BudgetOverview {
  overall: BudgetProgress | null;
  byCategory: Partial<Record<Category, BudgetProgress>>;
  /** Any budget at all, overall or per-category — drives the "set one up" prompt. */
  hasAny: boolean;
}

/**
 * Before this many days have elapsed, a projection describes the calendar more
 * than the spending: a single 300-lei shop on the 1st projects to 9 300 for the
 * month. Below the threshold the pace is not shown and never raises a warning —
 * an alarm that fires every month on the 2nd is one users learn to ignore.
 */
export const PROJECTION_MIN_DAYS = 5;

/** Days in the calendar month containing `date`. Day 0 of the next month is the last of this one. */
export function daysInMonthOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Rows whose category no longer exists in CATEGORIES are dropped rather than
 * kept: `category: null` is meaningful here (it *is* the overall budget), so a
 * stale value silently coerced to null would turn a forgotten category limit
 * into a second overall limit.
 */
export function parseBudgetRow(row: BudgetRow): Budget | null {
  if (row.category !== null && !isCategory(row.category)) return null;

  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: row.id,
    category: row.category === null ? null : (row.category as Category),
    amount,
    householdId: row.household_id,
  };
}

export function buildBudgetProgress(
  budget: Budget,
  spent: number,
  now = new Date(),
): BudgetProgress {
  const daysElapsed = now.getDate();
  const daysInMonth = daysInMonthOf(now);

  const projected = daysElapsed >= PROJECTION_MIN_DAYS ? (spent / daysElapsed) * daysInMonth : null;

  const status: BudgetStatus =
    spent > budget.amount
      ? 'over'
      : projected !== null && projected > budget.amount
        ? 'warning'
        : 'under';

  return {
    budget,
    spent,
    remaining: budget.amount - spent,
    percentUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    projected,
    status,
  };
}

export function buildBudgetOverview(
  budgets: Budget[],
  monthTotal: number,
  categoryTotals: CategoryTotal[],
  now = new Date(),
): BudgetOverview {
  const spentByCategory = new Map(categoryTotals.map((c) => [c.category, c.total]));

  let overall: BudgetProgress | null = null;
  const byCategory: Partial<Record<Category, BudgetProgress>> = {};

  for (const budget of budgets) {
    if (budget.category === null) {
      overall = buildBudgetProgress(budget, monthTotal, now);
    } else {
      byCategory[budget.category] = buildBudgetProgress(
        budget,
        spentByCategory.get(budget.category) ?? 0,
        now,
      );
    }
  }

  return { overall, byCategory, hasAny: budgets.length > 0 };
}

/**
 * Which budgets belong on the dashboard for the current view. Viewing another
 * member's spending has no budget to compare against — theirs is not yours to
 * see, and yours does not describe their total — so budgets are hidden.
 */
export function scopeForView(hasHousehold: boolean, who: string | null): BudgetScope | null {
  if (!hasHousehold) return 'personal';
  if (who === null) return 'household';
  if (who === 'me') return 'personal';
  return null;
}
