import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

  // `.select()` so the delete comes back as rows rather than just an error
  // slot. A DELETE that row-level security filters down to nothing is not an
  // error in Postgres — it is a successful statement that removed no rows — so
  // without asking for the deleted rows there is no way to tell "gone" from
  // "not yours to delete", and the caller is told it worked either way.
  const { data: deleted, error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!deleted?.length) {
    // Visible above but undeletable here: the row belongs to someone outside
    // the caller's household.
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Only once the row is actually gone. Removing the file first meant a
  // rejected delete still destroyed the photo of a receipt that stayed put.
  if (receipt.storage_path) {
    await supabase.storage.from('receipts').remove([receipt.storage_path]);
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');

  return NextResponse.json({ ok: true });
}
