import type { SupabaseClient } from '@supabase/supabase-js';
import { toDateString } from '@/lib/dashboard/aggregate';

export const RECEIPT_COLUMNS =
  'id, user_id, merchant, amount, purchase_date, category, subcategory, status, source, created_at';

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Processed expenses dated on or after `from`.
 *
 * The `or` is the important part: manual and backdated entries can have no
 * purchase_date, and those rows fall back to created_at — the same fallback
 * buildDashboardData uses when bucketing. Keeping the predicate here means the
 * dashboard and the budgets page cannot drift into counting different rows.
 */
export function expensesSince(supabase: SupabaseClient, from: Date) {
  return supabase
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .eq('status', 'processed')
    .or(
      `purchase_date.gte.${toDateString(from)},and(purchase_date.is.null,created_at.gte.${from.toISOString()})`,
    )
    .limit(5000);
}
