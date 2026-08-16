import { NextResponse } from 'next/server';
import { demoReceipts } from '@/lib/demo/fixtures';
import { demoHistoryPage } from '@/lib/demo/history';

/**
 * What `/api/receipts/history` is for the signed-in app, over the demo rows.
 *
 * A route rather than props on the page because the history list is a client
 * component that refetches on every filter change and keystroke — it needs
 * something to fetch, and pointing it at the real endpoint would only ever
 * return 401 here.
 *
 * Read-only by construction: it holds no client, touches no database, and
 * takes nothing from the request but the same seven query parameters.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = demoHistoryPage(demoReceipts(), {
    q: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    who: searchParams.get('who') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    offset: Number(searchParams.get('offset') ?? '0') || 0,
  });

  return NextResponse.json(page);
}
