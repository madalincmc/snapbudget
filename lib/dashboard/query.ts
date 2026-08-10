import type { SupabaseClient } from '@supabase/supabase-js';
import { toDateString } from '@/lib/dashboard/aggregate';

export const RECEIPT_COLUMNS =
  'id, user_id, merchant, amount, purchase_date, category, subcategory, status, source, created_at';

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Processed expenses dated on or after `from`, and before `to` when given.
 *
 * The `or` is the important part: manual and backdated entries can have no
 * purchase_date, and those rows fall back to created_at — the same fallback
 * buildDashboardData uses when bucketing. Keeping the predicate here means the
 * dashboard and the budgets page cannot drift into counting different rows.
 */
export function expensesBetween(supabase: SupabaseClient, from: Date, to?: Date) {
  let query = supabase
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .eq('status', 'processed')
    .or(
      `purchase_date.gte.${toDateString(from)},and(purchase_date.is.null,created_at.gte.${from.toISOString()})`,
    );

  if (to) {
    query = query.or(
      `purchase_date.lt.${toDateString(to)},and(purchase_date.is.null,created_at.lt.${to.toISOString()})`,
    );
  }

  return query.limit(5000);
}

/** Open-ended variant, for views that only need a lower bound. */
export function expensesSince(supabase: SupabaseClient, from: Date) {
  return expensesBetween(supabase, from);
}

/**
 * Per-month, per-category totals, summed in Postgres. Used wherever the window
 * spans more months than it would be safe to pull into memory — see the
 * monthly_spending migration for why the row-fetching path is kept for single
 * months only.
 *
 * `to` is exclusive. `userId` narrows to one member; null means everything the
 * caller can see, which for a household member is the pooled total.
 */
export function monthlySpending(
  supabase: SupabaseClient,
  from: Date,
  to: Date,
  userId: string | null = null,
) {
  return supabase.rpc('monthly_spending', {
    _from: toDateString(from),
    _to: toDateString(to),
    _user_id: userId,
  });
}
