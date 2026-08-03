import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectText } from '@/lib/ocr/vision';
import { parseReceiptText } from '@/lib/ocr/parse-receipt';
import { categorizeMerchant } from '@/lib/categorization/categorize';

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

  const { data: file, error: downloadError } = await supabase.storage
    .from('receipts')
    .download(receipt.storage_path);

  if (downloadError || !file) {
    return NextResponse.json({ error: 'download_failed' }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await detectText(buffer.toString('base64'));
    const parsed = parseReceiptText(text);
    const { category, subcategory } = categorizeMerchant(parsed.merchant);
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
