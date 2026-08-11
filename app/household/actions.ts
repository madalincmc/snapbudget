'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

function memberProfile(user: { user_metadata: Record<string, unknown>; email?: string }) {
  const metadata = user.user_metadata;
  return {
    display_name: (metadata.full_name as string | undefined) ?? user.email ?? null,
    avatar_url:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      null,
    email: user.email ?? null,
  };
}

export async function createHousehold(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    throw new Error('Numele gospodăriei este obligatoriu.');
  }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, owner_id: user.id })
    .select('id')
    .single();

  if (householdError || !household) {
    throw new Error(householdError?.message ?? 'Nu am putut crea gospodăria.');
  }

  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: user.id,
    role: 'owner',
    ...memberProfile(user),
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  revalidatePath('/household');
  revalidatePath('/dashboard');
  redirect('/household');
}

export async function inviteMember(formData: FormData) {
  const { supabase, user } = await requireUser();

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Adresă de email invalidă.');
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Doar proprietarul gospodăriei poate trimite invitații.');
  }

  if (email === user.email?.toLowerCase()) {
    throw new Error('Nu te poți invita pe tine însuți.');
  }

  const { error } = await supabase.from('household_invitations').insert({
    household_id: membership.household_id,
    email,
    invited_by: user.id,
  });

  if (error) {
    throw new Error(
      error.code === '23505'
        ? 'Această persoană are deja o invitație în așteptare.'
        : error.message,
    );
  }

  revalidatePath('/household');
}

export async function cancelInvitation(invitationId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from('household_invitations')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/household');
}

export async function removeMember(memberId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from('household_members').delete().eq('id', memberId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/household');
  revalidatePath('/dashboard');
}

export async function leaveHousehold(formData: FormData) {
  const { supabase, user } = await requireUser();

  const memberId = String(formData.get('memberId') ?? '');
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/household');
  revalidatePath('/dashboard');
  redirect('/household');
}

export async function acceptInvitation(formData: FormData) {
  const { supabase, user } = await requireUser();
  const invitationId = String(formData.get('invitationId') ?? '');

  const { data: existingMembership } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership) {
    throw new Error('Ești deja parte dintr-o gospodărie — părăsește-o mai întâi.');
  }

  const { data: invitation, error: invitationError } = await supabase
    .from('household_invitations')
    .select('id, household_id, status, email')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitationError || !invitation || invitation.status !== 'pending') {
    throw new Error('Invitația nu mai este valabilă.');
  }
  if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error('Această invitație nu este pentru contul tău.');
  }

  const { error: updateError } = await supabase
    .from('household_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: invitation.household_id,
    user_id: user.id,
    role: 'member',
    ...memberProfile(user),
  });

  if (memberError) {
    // Roll back the acceptance so the invitation can still be retried.
    await supabase
      .from('household_invitations')
      .update({ status: 'pending', responded_at: null })
      .eq('id', invitationId);
    throw new Error(memberError.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/household');
  redirect('/dashboard');
}

export async function declineInvitation(formData: FormData) {
  const { supabase, user } = await requireUser();
  const invitationId = String(formData.get('invitationId') ?? '');

  const { error } = await supabase
    .from('household_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', invitationId)
    .ilike('email', user.email ?? '');

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
}
