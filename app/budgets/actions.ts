'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, type Category } from '@/lib/categories';
import { getHouseholdMembership } from '@/lib/household/membership';

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

function revalidateBudgets() {
  revalidatePath('/budgets');
  revalidatePath('/dashboard');
}

function parseAmount(formData: FormData): number {
  const raw = String(formData.get('amount') ?? '')
    .trim()
    .replace(',', '.');
  const amount = Number(raw);
  if (!raw || Number.isNaN(amount) || amount <= 0) {
    throw new Error('Suma trebuie să fie mai mare decât 0.');
  }
  return amount;
}

/** '' / absent means the overall budget; anything else must be a known category. */
function parseCategory(formData: FormData): Category | null {
  const raw = String(formData.get('category') ?? '').trim();
  if (!raw) return null;
  if (!(CATEGORIES as readonly string[]).includes(raw)) {
    throw new Error('Categorie invalidă.');
  }
  return raw as Category;
}

/**
 * Sets the limit for one (scope, category) pair, creating it or replacing the
 * existing one. The form is "set the budget for X" rather than create-vs-edit,
 * which matches the unique indexes: there is only ever one budget per pair.
 *
 * Written as read-then-write rather than `.upsert()` because the uniqueness is
 * enforced by *partial* indexes, and PostgREST's `on_conflict` cannot carry the
 * `where` clause needed to name one as a conflict target.
 */
export async function saveBudget(formData: FormData) {
  const { supabase, user } = await requireUser();

  const amount = parseAmount(formData);
  const category = parseCategory(formData);
  const wantsHousehold = String(formData.get('scope') ?? 'personal') === 'household';

  // The household is resolved from the session, never taken from the form: a
  // client may say *which* scope it means, but must not supply the id it
  // resolves to. Asking for a household budget without a household is a
  // malformed request, not a silent downgrade to personal.
  const membership = await getHouseholdMembership(supabase, user.id);
  if (wantsHousehold && !membership) {
    throw new Error('Nu faci parte dintr-o gospodărie.');
  }
  const householdId = wantsHousehold ? membership!.householdId : null;

  let lookup = supabase.from('budgets').select('id');
  lookup = householdId
    ? lookup.eq('household_id', householdId)
    : lookup.is('household_id', null).eq('user_id', user.id);
  lookup = category === null ? lookup.is('category', null) : lookup.eq('category', category);

  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const { error } = existing
    ? await supabase.from('budgets').update({ amount }).eq('id', existing.id)
    : await supabase.from('budgets').insert({
        user_id: user.id,
        household_id: householdId,
        category,
        amount,
      });

  if (error) {
    throw new Error(error.message);
  }

  revalidateBudgets();
  redirect('/budgets');
}

export async function deleteBudget(id: string) {
  const { supabase } = await requireUser();

  // RLS decides whether this row is the caller's to remove: personal budgets
  // are creator-only, household ones are editable by any member.
  const { error } = await supabase.from('budgets').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateBudgets();
}
