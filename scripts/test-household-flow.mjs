/**
 * End-to-end check of the MAD-61 household RLS rules, driven through the
 * real Data API with two real (temporary) Supabase Auth users — the same
 * path the app takes, so policy mistakes surface here rather than in prod.
 * Creates and deletes its own users; safe to re-run.
 *
 *   npx dotenv -e .env.local -- node scripts/test-household-flow.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = Date.now();
const ownerEmail = `test-owner-${suffix}@snapbudget-test.local`;
const memberEmail = `test-member-${suffix}@snapbudget-test.local`;
const password = 'Test-Password-123!';

let ownerId, memberId, householdId, invitationId, ownerReceiptId, memberReceiptId;
let failures = 0;

function check(label, condition, extra = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${extra ? `  -> ${extra}` : ''}`);
  }
}

function fatal(label, extra) {
  failures++;
  console.log(`  FAIL  ${label}${extra ? `  -> ${extra}` : ''}`);
  throw new Error(`aborting: ${label}`);
}

async function signInAs(email) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

try {
  console.log('Creating two temporary Supabase Auth users...');
  const { data: ownerUser, error: ownerErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Owner' },
  });
  if (ownerErr) throw ownerErr;
  ownerId = ownerUser.user.id;

  const { data: memberUser, error: memberErr } = await admin.auth.admin.createUser({
    email: memberEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Member' },
  });
  if (memberErr) throw memberErr;
  memberId = memberUser.user.id;

  const owner = await signInAs(ownerEmail);
  const member = await signInAs(memberEmail);

  console.log('\n1. Owner creates a household (insert + RETURNING)');
  const { data: household, error: householdErr } = await owner
    .from('households')
    .insert({ name: 'Test Household', owner_id: ownerId })
    .select('id')
    .single();
  if (householdErr || !household)
    fatal('household insert returns the new row', householdErr?.message);
  check('household insert returns the new row', true);
  householdId = household.id;

  const { error: ownerMemberErr } = await owner.from('household_members').insert({
    household_id: householdId,
    user_id: ownerId,
    role: 'owner',
    display_name: 'Test Owner',
  });
  if (ownerMemberErr) fatal('owner joins as owner', ownerMemberErr.message);
  check('owner joins as owner', true);

  console.log('\n2. Owner invites a member by email');
  const { error: inviteErr } = await owner
    .from('household_invitations')
    .insert({ household_id: householdId, email: memberEmail, invited_by: ownerId });
  if (inviteErr) fatal('invitation insert succeeds', inviteErr.message);
  check('invitation insert succeeds', true);

  const { data: dupInvite } = await owner
    .from('household_invitations')
    .insert({ household_id: householdId, email: memberEmail, invited_by: ownerId })
    .select('id');
  check('duplicate pending invitation is rejected', !dupInvite);

  console.log('\n3. Before accepting, the invitee sees the invite but not the data');
  const { data: blockedMembers } = await member
    .from('household_members')
    .select('id')
    .eq('household_id', householdId);
  check('invitee cannot read the roster yet', (blockedMembers ?? []).length === 0);

  // Exactly the query the dashboard banner runs — needs the households join
  // to resolve, which is a separate RLS path from the invitation row itself.
  const { data: banner, error: bannerErr } = await member
    .from('household_invitations')
    .select('id, households(name)')
    .eq('status', 'pending')
    .ilike('email', memberEmail);
  check(
    'invitee sees their pending invitation',
    !bannerErr && (banner ?? []).length === 1,
    bannerErr?.message,
  );
  check(
    'invitation banner can read the household name',
    banner?.[0]?.households?.name === 'Test Household',
    JSON.stringify(banner?.[0]),
  );
  invitationId = banner?.[0]?.id;

  console.log('\n4. Invitee accepts');
  const { error: acceptErr } = await member
    .from('household_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invitationId);
  if (acceptErr) fatal('invitee can accept the invitation', acceptErr.message);
  check('invitee can accept the invitation', true);

  const { error: joinErr } = await member.from('household_members').insert({
    household_id: householdId,
    user_id: memberId,
    role: 'member',
    display_name: 'Test Member',
  });
  if (joinErr) fatal('invitee joins as member', joinErr.message);
  check('invitee joins as member', true);

  const { data: roster } = await member
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId);
  check('member now sees the full roster', (roster ?? []).length === 2);

  console.log('\n5. An uninvited stranger cannot join');
  const { error: strangerJoinErr } = await owner
    .from('household_members')
    .insert({ household_id: householdId, user_id: ownerId, role: 'member' });
  check('cannot self-insert a second membership', !!strangerJoinErr);

  console.log('\n6. Expenses are shared both ways');
  const newExpense = (userId) => ({
    user_id: userId,
    household_id: householdId,
    storage_path: null,
    amount: userId === ownerId ? 100 : 50,
    merchant: userId === ownerId ? 'Owner Expense' : 'Member Expense',
    purchase_date: new Date().toISOString().slice(0, 10),
    category: 'Altele',
    status: 'processed',
    source: 'manual',
  });

  const { data: ownerReceipt, error: ownerReceiptErr } = await owner
    .from('receipts')
    .insert(newExpense(ownerId))
    .select('id')
    .single();
  if (ownerReceiptErr) fatal('owner adds a household expense', ownerReceiptErr.message);
  check('owner adds a household expense', true);
  ownerReceiptId = ownerReceipt.id;

  const { data: memberReceipt, error: memberReceiptErr } = await member
    .from('receipts')
    .insert(newExpense(memberId))
    .select('id')
    .single();
  if (memberReceiptErr) fatal('member adds a household expense', memberReceiptErr.message);
  check('member adds a household expense', true);
  memberReceiptId = memberReceipt.id;

  const { data: memberSeesOwner } = await member
    .from('receipts')
    .select('id')
    .eq('id', ownerReceiptId);
  check("member sees the owner's expense", (memberSeesOwner ?? []).length === 1);

  const { data: ownerSeesAll } = await owner
    .from('receipts')
    .select('id')
    .eq('household_id', householdId);
  check('owner sees both expenses (combined household total)', (ownerSeesAll ?? []).length === 2);

  // Asserted the opposite until the receipt-edit migration (2026-08-14) made
  // UPDATE and DELETE match SELECT: a shared household is one pot, so whoever
  // spots a wrong entry can fix it, not only whoever photographed the receipt.
  // The check was left behind and had been failing ever since.
  console.log('\n7. Members can edit each other’s expenses');
  const { data: editAttempt } = await member
    .from('receipts')
    .update({ amount: 999 })
    .eq('id', ownerReceiptId)
    .select('id');
  check("member can edit the owner's expense", (editAttempt ?? []).length === 1);

  // The other half of that policy: an edit must not be able to push a row
  // somewhere the editor could no longer reach it.
  const { data: detachAttempt } = await member
    .from('receipts')
    .update({ household_id: null })
    .eq('id', ownerReceiptId)
    .select('id');
  check(
    "member cannot detach the owner's expense from the household",
    (detachAttempt ?? []).length === 0,
  );

  console.log('\n8. Co-membership drives shared receipt-photo access');
  const { data: coMember } = await member.rpc('is_household_co_member', {
    _other_user_id: ownerId,
  });
  check('member is recognised as a co-member of the owner', coMember === true);

  console.log('\n9. A complete outsider sees nothing');
  const outsiderEmail = `test-outsider-${suffix}@snapbudget-test.local`;
  const { data: outsiderUser } = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password,
    email_confirm: true,
  });
  const outsider = await signInAs(outsiderEmail);
  const { data: outsiderHouseholds } = await outsider
    .from('households')
    .select('id')
    .eq('id', householdId);
  check('outsider cannot see the household', (outsiderHouseholds ?? []).length === 0);
  const { data: outsiderReceipts } = await outsider
    .from('receipts')
    .select('id')
    .eq('household_id', householdId);
  check("outsider cannot see the household's expenses", (outsiderReceipts ?? []).length === 0);
  await admin.auth.admin.deleteUser(outsiderUser.user.id);

  console.log('\n10. Owner removes the member');
  const { data: memberRow } = await owner
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', memberId)
    .single();
  const { error: removeErr } = await owner
    .from('household_members')
    .delete()
    .eq('id', memberRow.id);
  check('owner can remove a member', !removeErr, removeErr?.message);

  const { data: afterRemoval } = await member
    .from('receipts')
    .select('id')
    .eq('household_id', householdId);
  check(
    "removed member keeps only their own expense, loses the owner's",
    (afterRemoval ?? []).length === 1 && afterRemoval[0].id === memberReceiptId,
    JSON.stringify(afterRemoval),
  );

  const { error: reAddErr } = await member
    .from('household_members')
    .insert({ household_id: householdId, user_id: memberId, role: 'member' });
  check('removed member cannot re-join without a new invitation', !!reAddErr);
} catch (err) {
  if (!String(err.message).startsWith('aborting:')) {
    console.error('\nUnexpected error:', err);
    failures++;
  }
} finally {
  console.log('\nCleaning up temporary users (cascades to their data)...');
  if (ownerId) await admin.auth.admin.deleteUser(ownerId).catch(() => {});
  if (memberId) await admin.auth.admin.deleteUser(memberId).catch(() => {});
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
}

process.exit(failures === 0 ? 0 : 1);
