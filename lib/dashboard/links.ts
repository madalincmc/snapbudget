import { CATEGORY_TOKEN, type Category } from '@/lib/categories';
import type { MonthKey } from '@/lib/dashboard/aggregate';

/**
 * The two things every dashboard-derived screen is scoped by: which month is
 * being browsed, and whose spending is in view.
 *
 * Both defaults — the current month, and everyone in the household — stay out
 * of the URL, matching what MonthPicker and HouseholdFilter do when they write
 * the query string. Passing `month` for the current month would produce a URL
 * that stops being right at midnight on the first of the next month.
 */
export interface ViewParams {
  month?: MonthKey | null;
  who?: string | null;
}

function query({ month, who }: ViewParams): string {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (who) params.set('who', who);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** One category's screen, for the given view. */
export function categoryPath(category: Category, view: ViewParams = {}): string {
  return `/categories/${CATEGORY_TOKEN[category]}${query(view)}`;
}

/** Back to the dashboard, still on the month and member being looked at. */
export function dashboardPath(view: ViewParams = {}): string {
  return `/dashboard${query(view)}`;
}
