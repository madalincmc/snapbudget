import { isSpent, receiptMonth, type MonthKey, type ReceiptRow } from '@/lib/dashboard/aggregate';
import type { HouseholdMemberInfo } from '@/lib/household/membership';

export interface MemberSpending {
  /** Null on the rolled-up row for people who have since left the household. */
  userId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  total: number;
  /** How many expenses make up the total — a big number from few receipts reads differently. */
  count: number;
  /** Percent of the household total, 0–100. */
  share: number;
}

export interface HouseholdSpending {
  total: number;
  /** Every member, biggest spender first — including those who spent nothing. */
  members: MemberSpending[];
  /** The largest single total, for scaling the bars against each other. */
  max: number;
}

/**
 * Who spent how much, for one month.
 *
 * Members with nothing on them are kept rather than filtered out: "Ana — 0 lei"
 * is an answer to the question this card asks, and a roster that shrinks and
 * grows month to month is harder to read than one that stays put.
 */
export function buildHouseholdSpending(
  receipts: ReceiptRow[],
  members: HouseholdMemberInfo[],
  month: MonthKey,
): HouseholdSpending {
  const totals = new Map<string, { total: number; count: number }>();

  for (const r of receipts) {
    if (!isSpent(r) || receiptMonth(r) !== month) continue;
    const entry = totals.get(r.user_id) ?? { total: 0, count: 0 };
    entry.total += r.amount ?? 0;
    entry.count += 1;
    totals.set(r.user_id, entry);
  }

  const rows: MemberSpending[] = members.map((m) => {
    const entry = totals.get(m.userId);
    return {
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      total: entry?.total ?? 0,
      count: entry?.count ?? 0,
      share: 0,
    };
  });

  // Expenses added by someone who has since been removed keep pointing at the
  // household, so they still count towards its total. Rolled into one row
  // rather than dropped, so the parts on screen always add up to the whole.
  const roster = new Set(members.map((m) => m.userId));
  const departed = [...totals.entries()].filter(([userId]) => !roster.has(userId));

  if (departed.length > 0) {
    rows.push({
      userId: null,
      displayName: null,
      avatarUrl: null,
      total: departed.reduce((sum, [, entry]) => sum + entry.total, 0),
      count: departed.reduce((sum, [, entry]) => sum + entry.count, 0),
      share: 0,
    });
  }

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  for (const row of rows) {
    row.share = total > 0 ? (row.total / total) * 100 : 0;
  }

  // Biggest spender first — the ranking is the point of the card. Sort is
  // stable, so members who spent the same (typically nothing) stay in the join
  // order the caller passed in rather than reshuffling between renders.
  rows.sort((a, b) => b.total - a.total);

  return { total, members: rows, max: Math.max(...rows.map((r) => r.total), 0) };
}
