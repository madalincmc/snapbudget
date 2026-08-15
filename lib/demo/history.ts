import type { ReceiptRow } from '@/lib/dashboard/aggregate';
import { isCategory } from '@/lib/categories';
import { DEMO_ME } from '@/lib/demo/fixtures';

/** Same page size as the real endpoint, so "Încarcă mai multe" behaves the same. */
export const DEMO_PAGE_SIZE = 30;

export interface DemoHistoryQuery {
  q?: string;
  category?: string;
  /** "YYYY-MM". */
  month?: string;
  who?: string;
  sort?: string;
  offset?: number;
}

export interface DemoHistoryPage {
  receipts: (ReceiptRow & { thumbnailUrl: null })[];
  hasMore: boolean;
}

type Key = 'purchase_date' | 'amount' | 'merchant';

const SORTS: Record<string, { key: Key; ascending: boolean }> = {
  date_desc: { key: 'purchase_date', ascending: false },
  date_asc: { key: 'purchase_date', ascending: true },
  amount_desc: { key: 'amount', ascending: false },
  amount_asc: { key: 'amount', ascending: true },
  merchant_asc: { key: 'merchant', ascending: true },
  merchant_desc: { key: 'merchant', ascending: false },
};

function compare(a: ReceiptRow, b: ReceiptRow, key: Key, ascending: boolean): number {
  const left = a[key];
  const right = b[key];

  // Nulls last in both directions — `nullsFirst: false` on the real query.
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  const order =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'ro');

  return ascending ? order : -order;
}

/**
 * The history endpoint's filtering, sorting and paging, done in memory over
 * the demo rows.
 *
 * It is a second implementation of what PostgREST does in the real route, and
 * deliberately a narrow one: same six sorts, same page size, nulls last, a
 * month filter that reads purchase_date only — so a row with no date on it
 * drops out of a month filter here exactly as it does there, rather than
 * looking like a bug the moment someone compares the two screens.
 */
export function demoHistoryPage(rows: ReceiptRow[], query: DemoHistoryQuery): DemoHistoryPage {
  const { q = '', category = '', month = '', who = '', sort = 'date_desc' } = query;
  const offset = Math.max(0, query.offset ?? 0);

  let matched = rows;

  if (who === 'me') {
    matched = matched.filter((r) => r.user_id === DEMO_ME);
  } else if (who) {
    matched = matched.filter((r) => r.user_id === who);
  }

  const needle = q.trim().toLowerCase();
  if (needle) {
    matched = matched.filter((r) => (r.merchant ?? '').toLowerCase().includes(needle));
  }

  if (isCategory(category)) {
    matched = matched.filter((r) => r.category === category);
  }

  if (/^\d{4}-\d{2}$/.test(month)) {
    matched = matched.filter((r) => r.purchase_date?.startsWith(month) ?? false);
  }

  const { key, ascending } = SORTS[sort] ?? SORTS.date_desc;
  // Sorted on a copy: the caller's array is the fixture set, and every request
  // would otherwise reorder it for the next one.
  const sorted = [...matched].sort(
    (a, b) => compare(a, b, key, ascending) || a.id.localeCompare(b.id),
  );

  const page = sorted.slice(offset, offset + DEMO_PAGE_SIZE);

  return {
    // No photos behind the demo rows, so every thumbnail falls back to the
    // category-tinted icon the app shows for a manual entry.
    receipts: page.map((r) => ({ ...r, thumbnailUrl: null })),
    hasMore: offset + DEMO_PAGE_SIZE < sorted.length,
  };
}
