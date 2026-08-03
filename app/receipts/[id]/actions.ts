'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';

export async function updateReceipt(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const merchant = String(formData.get('merchant') ?? '').trim() || null;
  const amountRaw = String(formData.get('amount') ?? '').trim();
  const purchaseDate = String(formData.get('purchase_date') ?? '').trim() || null;
  const categoryRaw = String(formData.get('category') ?? '');

  const amount = amountRaw ? Number(amountRaw) : null;
  if (amountRaw && (Number.isNaN(amount) || (amount as number) < 0)) {
    throw new Error('Sumă invalidă');
  }

  const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'Altele';

  const { error } = await supabase
    .from('receipts')
    .update({
      merchant,
      amount,
      purchase_date: purchaseDate,
      category,
      status: amount !== null ? 'processed' : 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
