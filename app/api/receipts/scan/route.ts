import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DOWNLOAD_FAILED, scanReceipt } from '@/lib/ocr/scan';

/**
 * Reads an uploaded image and hands back what it found, without saving a thing.
 *
 * The single-receipt screen asks the reader to check the figures before the
 * expense exists, so there is nothing to update yet — which is the difference
 * between this and `/api/receipts/[id]/process`, where the row is already
 * there and the batch screen is committing to it.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const path = body?.path;

  // Storage RLS says the same thing, but this route reads an image with no
  // receipt row behind it to carry permissions, so it states the rule itself
  // rather than leaning on one policy alone.
  if (typeof path !== 'string' || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    return NextResponse.json(await scanReceipt(supabase, path));
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json(
      { error: message },
      { status: message === DOWNLOAD_FAILED ? 404 : 500 },
    );
  }
}
