import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { deleteReceipt } from '@/lib/receipts/delete';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await deleteReceipt(supabase, id);

  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : result.reason === 'forbidden' ? 403 : 500;
    return NextResponse.json(
      { error: result.reason === 'error' ? result.message : result.reason },
      { status },
    );
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');

  return NextResponse.json({ ok: true });
}
