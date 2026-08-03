'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, isSubcategoryOf, type Category } from '@/lib/categories';

export async function createManualExpense(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const amountRaw = String(formData.get('amount') ?? '').trim();
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    throw new Error('Suma trebuie să fie mai mare decât 0.');
  }

  const categoryRaw = String(formData.get('category') ?? '');
  if (!(CATEGORIES as readonly string[]).includes(categoryRaw)) {
    throw new Error('Categorie invalidă.');
  }
  const category = categoryRaw as Category;

  const subcategoryRaw = String(formData.get('subcategory') ?? '').trim() || null;
  const subcategory = isSubcategoryOf(category, subcategoryRaw) ? subcategoryRaw : null;

  const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
  if (!purchaseDate) {
    throw new Error('Data este obligatorie.');
  }

  const merchant = String(formData.get('merchant') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const { error } = await supabase.from('receipts').insert({
    user_id: user.id,
    storage_path: null,
    merchant,
    amount,
    purchase_date: purchaseDate,
    category,
    subcategory,
    notes,
    status: 'processed',
    source: 'manual',
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/dashboard');
}
