'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, isSubcategoryOf, type Category } from '@/lib/categories';
import { isFrequency } from '@/lib/recurring';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  return { supabase, user };
}

/** Newly due occurrences show up immediately rather than waiting for the
 *  nightly sweep. Safe to call repeatedly — generation is idempotent. */
async function generateAndRevalidate(supabase: Awaited<ReturnType<typeof createClient>>) {
  await supabase.rpc('generate_my_recurring');
  revalidatePath('/dashboard');
  revalidatePath('/history');
  revalidatePath('/recurring');
}

function parseForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) {
    throw new Error('Titlul este obligatoriu.');
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

  const frequencyRaw = String(formData.get('frequency') ?? '');
  if (!isFrequency(frequencyRaw)) {
    throw new Error('Frecvență invalidă.');
  }

  const startDate = String(formData.get('start_date') ?? '').trim();
  if (!startDate) {
    throw new Error('Data de început este obligatorie.');
  }

  const notes = String(formData.get('notes') ?? '').trim() || null;

  return { title, amount, category, subcategory, frequency: frequencyRaw, startDate, notes };
}

export async function createRecurring(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseForm(formData);

  const { error } = await supabase.from('recurring_expenses').insert({
    user_id: user.id,
    title: parsed.title,
    amount: parsed.amount,
    category: parsed.category,
    subcategory: parsed.subcategory,
    frequency: parsed.frequency,
    start_date: parsed.startDate,
    notes: parsed.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  await generateAndRevalidate(supabase);
  redirect('/recurring');
}

export async function updateRecurring(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = parseForm(formData);

  // Only future occurrences are affected: already-generated expenses are
  // ordinary rows and are deliberately left untouched.
  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      title: parsed.title,
      amount: parsed.amount,
      category: parsed.category,
      subcategory: parsed.subcategory,
      frequency: parsed.frequency,
      start_date: parsed.startDate,
      notes: parsed.notes,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await generateAndRevalidate(supabase);
  redirect('/recurring');
}

export async function pauseRecurring(id: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from('recurring_expenses')
    .update({ paused: true })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/recurring');
}

export async function resumeRecurring(id: string) {
  const { supabase } = await requireUser();

  // RPC rather than a plain update: resuming also skips whatever fell due
  // while paused, so switching a rule back on cannot dump backdated expenses.
  const { error } = await supabase.rpc('resume_recurring_expense', { _id: id });

  if (error) {
    throw new Error(error.message);
  }

  await generateAndRevalidate(supabase);
}

export async function deleteRecurring(id: string) {
  const { supabase } = await requireUser();

  // Expenses already generated survive: receipts.recurring_expense_id is
  // ON DELETE SET NULL, so deleting a rule never rewrites spending history.
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/recurring');
  revalidatePath('/dashboard');
  // Deleting happens from the rule's own page, which no longer exists.
  redirect('/recurring');
}
