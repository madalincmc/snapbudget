import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!receipt) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (receipt.storage_path) {
    await supabase.storage.from('receipts').remove([receipt.storage_path]);
  }

  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
