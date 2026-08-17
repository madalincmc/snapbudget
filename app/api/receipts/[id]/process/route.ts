import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanReceipt } from '@/lib/ocr/scan';

/**
 * Reads a receipt that already exists and commits what it finds to the row.
 *
 * Used by the batch screen, which has no review step to hold the reading
 * against. The single-receipt screen goes through `/api/receipts/scan`
 * instead, which reads the same image and saves nothing.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: receipt, error: fetchError } = await supabase
    .from('receipts')
    .select('id, storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !receipt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const parsed = await scanReceipt(supabase, receipt.storage_path);
    const { category, subcategory } = parsed;
    const status = parsed.amount !== null ? 'processed' : 'failed';

    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        merchant: parsed.merchant,
        amount: parsed.amount,
        purchase_date: parsed.purchaseDate,
        category,
        subcategory,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ...parsed, category, subcategory, status });
  } catch (err) {
    await supabase
      .from('receipts')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
