'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, isSubcategoryOf, type Category } from '@/lib/categories';
import { returnPathFor } from '@/lib/receipts/return-path';

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

  const category = (
    (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'Altele'
  ) as Category;

  const subcategoryRaw = String(formData.get('subcategory') ?? '').trim() || null;
  const subcategory = isSubcategoryOf(category, subcategoryRaw) ? subcategoryRaw : null;

  // `.select()` for the same reason as the delete route: an UPDATE that
  // row-level security narrows to zero rows reports no error, so without the
  // returned rows this would redirect back to a list still showing the old
  // values, as if the save had gone through.
  const { data: updated, error } = await supabase
    .from('receipts')
    .update({
      merchant,
      amount,
      purchase_date: purchaseDate,
      category,
      subcategory,
      status: amount !== null ? 'processed' : 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  if (!updated?.length) {
    throw new Error('Nu poți edita această cheltuială.');
  }

  const destination = returnPathFor(String(formData.get('from') ?? '') || undefined);
  revalidatePath('/dashboard');
  revalidatePath('/history');
  redirect(destination);
}
