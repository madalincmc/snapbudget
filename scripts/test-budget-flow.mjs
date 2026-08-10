/**
 * End-to-end check of the MAD-67 budget rules, driven through the real Data
 * API with real (temporary) Supabase Auth users — the same path the app takes,
 * so policy and constraint mistakes surface here rather than in prod.
 * Creates and deletes its own users; safe to re-run.
 *
 *   npx dotenv -e .env.local -- node scripts/test-budget-flow.mjs
 *
 * What it is really pinning down:
 *   - the four partial unique indexes (a plain unique constraint would let
 *     NULL categories through, silently allowing two overall budgets);
 *   - that household budgets are editable by any member, unlike receipts,
 *     which stay creator-only.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = Date.now();
const ownerEmail = `test-budget-owner-${suffix}@snapbudget-test.local`;
const memberEmail = `test-budget-member-${suffix}@snapbudget-test.local`;
const password = 'Test-Password-123!';

let ownerId, memberId, householdId;
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
    user_metadata: { full_name: 'Budget Owner' },
  });
  if (ownerErr) throw ownerErr;
  ownerId = ownerUser.user.id;

  const { data: memberUser, error: memberErr } = await admin.auth.admin.createUser({
    email: memberEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Budget Member' },
  });
  if (memberErr) throw memberErr;
  memberId = memberUser.user.id;

  const owner = await signInAs(ownerEmail);
  const member = await signInAs(memberEmail);

  console.log('\n1. Personal budgets');
  const { error: overallErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: null, amount: 3000 });
  if (overallErr) fatal('owner sets a personal overall budget', overallErr.message);
  check('owner sets a personal overall budget', true);

  const { error: dupOverallErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: null, amount: 4000 });
  check(
    'a second personal overall budget is rejected (NULL category still collides)',
    !!dupOverallErr,
  );

  const { error: catErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: 'Transport', amount: 500 });
  check('owner sets a personal category budget', !catErr, catErr?.message);

  const { error: dupCatErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: 'Transport', amount: 600 });
  check('a second budget for the same category is rejected', !!dupCatErr);

  const { error: otherCatErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: 'Casă', amount: 900 });
  check('a different category is still allowed', !otherCatErr, otherCatErr?.message);

  const { error: negativeErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: null, category: 'Sănătate', amount: 0 });
  check('a zero/negative amount is rejected', !!negativeErr);

  console.log('\n2. Another user cannot see or touch a personal budget');
  const { data: memberSeesPersonal } = await member
    .from('budgets')
    .select('id')
    .eq('user_id', ownerId);
  check("member cannot read the owner's personal budgets", (memberSeesPersonal ?? []).length === 0);

  const { data: memberEditsPersonal } = await member
    .from('budgets')
    .update({ amount: 1 })
    .eq('user_id', ownerId)
    .select('id');
  check(
    "member cannot edit the owner's personal budgets",
    (memberEditsPersonal ?? []).length === 0,
  );

  console.log('\n3. Household setup');
  const { data: household, error: householdErr } = await owner
    .from('households')
    .insert({ name: 'Budget Household', owner_id: ownerId })
    .select('id')
    .single();
  if (householdErr || !household) fatal('owner creates a household', householdErr?.message);
  householdId = household.id;

  await owner
    .from('household_members')
    .insert({ household_id: householdId, user_id: ownerId, role: 'owner' });
  await owner
    .from('household_invitations')
    .insert({ household_id: householdId, email: memberEmail, invited_by: ownerId });

  const { data: invite } = await member
    .from('household_invitations')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', memberEmail)
    .single();
  await member
    .from('household_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invite.id);
  const { error: joinErr } = await member
    .from('household_members')
    .insert({ household_id: householdId, user_id: memberId, role: 'member' });
  if (joinErr) fatal('member joins the household', joinErr.message);
  check('household with two members is set up', true);

  console.log('\n4. Household budgets are shared, and editable by any member');
  const { data: hhBudget, error: hhErr } = await owner
    .from('budgets')
    .insert({ user_id: ownerId, household_id: householdId, category: null, amount: 5000 })
    .select('id')
    .single();
  if (hhErr) fatal('owner sets a household overall budget', hhErr.message);
  check('owner sets a household overall budget', true);

  const { data: memberSeesHh } = await member.from('budgets').select('id').eq('id', hhBudget.id);
  check('member sees the household budget', (memberSeesHh ?? []).length === 1);

  const { data: memberEdit } = await member
    .from('budgets')
    .update({ amount: 5500 })
    .eq('id', hhBudget.id)
    .select('amount');
  check(
    'member can edit the household budget (shared config, unlike receipts)',
    (memberEdit ?? []).length === 1 && Number(memberEdit[0].amount) === 5500,
    JSON.stringify(memberEdit),
  );

  const { error: memberDupErr } = await member
    .from('budgets')
    .insert({ user_id: memberId, household_id: householdId, category: null, amount: 7000 });
  check(
    'member cannot add a second household overall budget (keyed on household, not user)',
    !!memberDupErr,
  );

  console.log('\n5. Personal and household budgets coexist');
  const { data: ownerAll } = await owner.from('budgets').select('id, household_id, category');
  const personalCount = (ownerAll ?? []).filter((b) => b.household_id === null).length;
  const householdCount = (ownerAll ?? []).filter((b) => b.household_id !== null).length;
  check(
    'owner sees 3 personal + 1 household budget',
    personalCount === 3 && householdCount === 1,
    JSON.stringify({ personalCount, householdCount }),
  );

  console.log('\n6. An outsider sees nothing');
  const outsiderEmail = `test-budget-outsider-${suffix}@snapbudget-test.local`;
  const { data: outsiderUser } = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password,
    email_confirm: true,
  });
  const outsider = await signInAs(outsiderEmail);
  const { data: outsiderBudgets } = await outsider
    .from('budgets')
    .select('id')
    .eq('household_id', householdId);
  check("outsider cannot see the household's budgets", (outsiderBudgets ?? []).length === 0);
  await admin.auth.admin.deleteUser(outsiderUser.user.id);

  console.log('\n7. Leaving the household leaves its budget behind');
  const { data: memberRow } = await member
    .from('household_members')
    .select('id')
    .eq('user_id', memberId)
    .single();
  await member.from('household_members').delete().eq('id', memberRow.id);

  const { data: afterLeave } = await member.from('budgets').select('id').eq('id', hhBudget.id);
  check('a departed member no longer sees the household budget', (afterLeave ?? []).length === 0);

  const { data: ownerStillSees } = await owner.from('budgets').select('id').eq('id', hhBudget.id);
  check('the owner still has the household budget', (ownerStillSees ?? []).length === 1);
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
