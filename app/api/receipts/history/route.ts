import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCategory } from '@/lib/categories';
import { isDateKey } from '@/lib/history/date-range';

const PAGE_SIZE = 30;

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  date_desc: { column: 'purchase_date', ascending: false },
  date_asc: { column: 'purchase_date', ascending: true },
  amount_desc: { column: 'amount', ascending: false },
  amount_asc: { column: 'amount', ascending: true },
  merchant_asc: { column: 'merchant', ascending: true },
  merchant_desc: { column: 'merchant', ascending: false },
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const categoryParam = searchParams.get('category') ?? '';
  // Already resolved to calendar dates by the browser, which is the only place
  // that knows what "this month" means in the reader's timezone.
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const sort = searchParams.get('sort') ?? 'date_desc';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '0') || 0);
  const who = searchParams.get('who') ?? '';

  let query = supabase
    .from('receipts')
    .select(
      'id, user_id, merchant, amount, purchase_date, category, subcategory, status, source, storage_path, created_at',
      { count: 'exact' },
    );

  if (who === 'me') {
    query = query.eq('user_id', user.id);
  } else if (who) {
    // Any other id is trusted to RLS: a non-co-member id just yields zero rows.
    query = query.eq('user_id', who);
  }

  if (q) {
    query = query.ilike('merchant', `%${q}%`);
  }
  if (isCategory(categoryParam)) {
    query = query.eq('category', categoryParam);
  }
  // Inclusive on both ends, and each end applied on its own so an open-ended
  // interval ("everything since March") is a single bound rather than a special
  // case. A row with no purchase_date drops out either way — NULL compares
  // false — which is what the dateless rows did under the old month filter too.
  if (isDateKey(from)) {
    query = query.gte('purchase_date', from);
  }
  if (isDateKey(to)) {
    query = query.lte('purchase_date', to);
  }

  const { column, ascending } = SORT_MAP[sort] ?? SORT_MAP.date_desc;
  query = query
    .order(column, { ascending, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const receiptPaths = rows
    .filter((r) => r.source !== 'manual' && r.storage_path)
    .map((r) => r.storage_path as string);

  const thumbnails: Record<string, string> = {};
  if (receiptPaths.length) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrls(receiptPaths, 600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) thumbnails[s.path] = s.signedUrl;
    }
  }

  const receipts = rows.map((r) => ({
    ...r,
    thumbnailUrl: r.storage_path ? (thumbnails[r.storage_path] ?? null) : null,
  }));

  return NextResponse.json({
    receipts,
    hasMore: offset + PAGE_SIZE < (count ?? 0),
  });
}
