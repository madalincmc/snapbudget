'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, type SendResult } from '@/lib/email/send';
import {
  canonicalEmail,
  invitationEmail,
  invitationExpiry,
  invitationUrl,
  isExpired,
} from '@/lib/household/invitations';

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

  // By mailbox, so writing your own address with dots does not get you past it.
  if (user.email && canonicalEmail(email) === canonicalEmail(user.email)) {
    throw new Error('Nu te poți invita pe tine însuți.');
  }

  const { data: invitation, error } = await supabase
    .from('household_invitations')
    .insert({
      household_id: membership.household_id,
      email,
      invited_by: user.id,
      expires_at: invitationExpiry().toISOString(),
    })
    .select('id, expires_at')
    .single();

  if (error || !invitation) {
    throw new Error(
      error?.code === '23505'
        ? 'Această persoană are deja o invitație în așteptare.'
        : (error?.message ?? 'Nu am putut crea invitația.'),
    );
  }

  // The invitation exists either way. A mail outage is not a reason to undo it
  // — the owner can send it again from the household screen — so the result is
  // reported rather than thrown.
  const delivery = await deliverInvitation(supabase, {
    invitationId: invitation.id,
    email,
    householdId: membership.household_id,
    expiresAt: invitation.expires_at,
    inviter: user,
  });

  revalidatePath('/household');
  redirect(`/household?invite=${delivery.sent ? 'sent' : delivery.reason}`);
}

/**
 * Builds and sends the invitation email.
 *
 * Never throws: the caller has already written a row, and losing the
 * invitation because the relay was down would be the wrong trade.
 */
async function deliverInvitation(
  supabase: SupabaseClient,
  params: {
    invitationId: string;
    email: string;
    householdId: string;
    expiresAt: string;
    inviter: { user_metadata: Record<string, unknown>; email?: string };
  },
): Promise<SendResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { sent: false, reason: 'not_configured' };

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', params.householdId)
    .maybeSingle();

  const inviterName =
    (params.inviter.user_metadata.full_name as string | undefined) ??
    params.inviter.email ??
    'Cineva';

  const body = invitationEmail({
    inviterName,
    householdName: household?.name ?? 'gospodăria',
    url: invitationUrl(siteUrl, params.invitationId),
    expiresAt: params.expiresAt,
  });

  return sendEmail({ to: params.email, replyTo: params.inviter.email, ...body });
}

/**
 * Sends a pending invitation again.
 *
 * Extends the existing row rather than writing a second one — a new row would
 * either collide with the pending-unique index or, worse, leave two live links
 * to the same household. Nothing about membership changes here.
 */
export async function resendInvitation(invitationId: string) {
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Doar proprietarul gospodăriei poate retrimite invitații.');
  }

  const { data: invitation, error } = await supabase
    .from('household_invitations')
    .update({ expires_at: invitationExpiry().toISOString() })
    .eq('id', invitationId)
    .eq('household_id', membership.household_id)
    .eq('status', 'pending')
    .select('id, email, expires_at')
    .maybeSingle();

  if (error || !invitation) {
    throw new Error('Invitația nu mai este în așteptare.');
  }

  const delivery = await deliverInvitation(supabase, {
    invitationId: invitation.id,
    email: invitation.email,
    householdId: membership.household_id,
    expiresAt: invitation.expires_at,
    inviter: user,
  });

  revalidatePath('/household');
  redirect(`/household?invite=${delivery.sent ? 'resent' : delivery.reason}`);
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
    .select('id, household_id, status, email, expires_at')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitationError || !invitation || invitation.status !== 'pending') {
    throw new Error('Invitația nu mai este valabilă.');
  }
  // Checked here rather than trusted from the link: the row is what decides,
  // and the owner can make it live again by sending it a second time.
  if (isExpired(invitation.expires_at)) {
    throw new Error('Invitația a expirat. Cere-i proprietarului să ți-o trimită din nou.');
  }
  // The mailbox decides, not the spelling: Google reports whatever form the
  // account was registered under, dots and all.
  if (!user.email || canonicalEmail(invitation.email) !== canonicalEmail(user.email)) {
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
    .eq('email_canonical', canonicalEmail(user.email ?? ''));

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
}
