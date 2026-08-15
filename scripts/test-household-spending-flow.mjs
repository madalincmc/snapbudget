/**
 * End-to-end check of the per-member spending breakdown on the household tab,
 * driven through the real Data API with real (temporary) Supabase Auth users.
 * Creates and deletes its own users; safe to re-run.
 *
 *   npx dotenv -e .env.local -- node scripts/test-household-spending-flow.mjs
 *
 * What it is really pinning down:
 *   - both members read the *same* per-person totals — the whole point of the
 *     card, and the reason it filters on household_id rather than leaning on
 *     RLS, which would fold each reader's own pre-household expenses in;
 *   - the month predicate composes correctly once household_id is added to it
 *     (two `.or()` calls AND together, and a row with no purchase_date still
 *     falls back to created_at);
 *   - expenses left behind by a removed member stay attached to the household,
 *     which is why the UI rolls them into a "Foști membri" row instead of
 *     letting the parts stop adding up to the total.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = Date.now();
const ownerEmail = `test-spend-owner-${suffix}@snapbudget-test.local`;
const memberEmail = `test-spend-member-${suffix}@snapbudget-test.local`;
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

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const previousMonthDay = new Date(now.getFullYear(), now.getMonth(), 0);

function dateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mirrors expensesBetween() in lib/dashboard/query.ts, scoped to a household. */
function householdMonthExpenses(client) {
  return client
    .from('receipts')
    .select('user_id, amount, purchase_date, created_at, status')
    .eq('status', 'processed')
    .or(
      `purchase_date.gte.${dateString(monthStart)},and(purchase_date.is.null,created_at.gte.${monthStart.toISOString()})`,
    )
    .or(
      `purchase_date.lt.${dateString(nextMonthStart)},and(purchase_date.is.null,created_at.lt.${nextMonthStart.toISOString()})`,
    )
    .limit(5000)
    .eq('household_id', householdId);
}

/** The grouping buildHouseholdSpending() does, as a plain {userId: total} map. */
function totalsByUser(rows) {
  const totals = {};
  for (const r of rows ?? []) {
    totals[r.user_id] = (totals[r.user_id] ?? 0) + Number(r.amount ?? 0);
  }
  return totals;
}

try {
  console.log('Creating two temporary Supabase Auth users...');
  const { data: ownerUser, error: ownerErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Spend Owner' },
  });
  if (ownerErr) throw ownerErr;
  ownerId = ownerUser.user.id;

  const { data: memberUser, error: memberErr } = await admin.auth.admin.createUser({
    email: memberEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Spend Member' },
  });
  if (memberErr) throw memberErr;
  memberId = memberUser.user.id;

  const owner = await signInAs(ownerEmail);
  const member = await signInAs(memberEmail);

  console.log('\n1. An expense added before there is a household');
  const { error: preErr } = await owner.from('receipts').insert({
    user_id: ownerId,
    household_id: null,
    merchant: 'Dinainte',
    amount: 999,
    purchase_date: dateString(now),
    status: 'processed',
    source: 'manual',
  });
  if (preErr) fatal('owner adds a private expense', preErr.message);
  check('owner adds a private expense, before joining any household', true);

  console.log('\n2. Household setup');
  const { data: household, error: householdErr } = await owner
    .from('households')
    .insert({ name: 'Spending Household', owner_id: ownerId })
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

  console.log('\n3. Shared expenses, including the shapes that bucket by created_at');
  const shared = [
    { by: owner, userId: ownerId, amount: 100, purchase_date: dateString(now) },
    { by: owner, userId: ownerId, amount: 50, purchase_date: null },
    { by: member, userId: memberId, amount: 300, purchase_date: dateString(now) },
    // Excluded: last month, and a row still waiting on OCR.
    { by: member, userId: memberId, amount: 700, purchase_date: dateString(previousMonthDay) },
    {
      by: member,
      userId: memberId,
      amount: 800,
      purchase_date: dateString(now),
      status: 'pending',
    },
  ];

  for (const row of shared) {
    const { error } = await row.by.from('receipts').insert({
      user_id: row.userId,
      household_id: householdId,
      merchant: 'Magazin',
      amount: row.amount,
      purchase_date: row.purchase_date,
      status: row.status ?? 'processed',
      source: 'manual',
    });
    if (error) fatal(`inserting a ${row.amount} lei expense`, error.message);
  }
  check('five expenses added across both members', true);

  console.log('\n4. Both members read the same breakdown');
  const { data: ownerRows, error: ownerReadErr } = await householdMonthExpenses(owner);
  if (ownerReadErr) fatal('owner reads the month', ownerReadErr.message);
  const { data: memberRows, error: memberReadErr } = await householdMonthExpenses(member);
  if (memberReadErr) fatal('member reads the month', memberReadErr.message);

  const ownerTotals = totalsByUser(ownerRows);
  const memberTotals = totalsByUser(memberRows);

  check(
    'owner sees 150 for himself and 300 for the member',
    ownerTotals[ownerId] === 150 && ownerTotals[memberId] === 300,
    JSON.stringify(ownerTotals),
  );
  check(
    'the member sees exactly the same two numbers',
    JSON.stringify(ownerTotals) === JSON.stringify(memberTotals),
    JSON.stringify(memberTotals),
  );
  check(
    "the owner's pre-household 999 is not folded into his household total",
    ownerTotals[ownerId] === 150,
    JSON.stringify(ownerTotals),
  );
  check(
    'last month and the unprocessed row are both out',
    Object.values(ownerTotals).reduce((a, b) => a + b, 0) === 450,
    JSON.stringify(ownerTotals),
  );
  check(
    'the expense with no purchase_date still counts, via created_at',
    (ownerRows ?? []).some((r) => r.purchase_date === null && Number(r.amount) === 50),
  );

  console.log('\n5. A removed member leaves their expenses behind');
  const { data: memberRow } = await member
    .from('household_members')
    .select('id')
    .eq('user_id', memberId)
    .single();
  const { error: removeErr } = await owner
    .from('household_members')
    .delete()
    .eq('id', memberRow.id);
  if (removeErr) fatal('owner removes the member', removeErr.message);

  const { data: afterRemoval } = await householdMonthExpenses(owner);
  const afterTotals = totalsByUser(afterRemoval);
  check(
    "the departed member's 300 still counts towards the household",
    afterTotals[memberId] === 300,
    JSON.stringify(afterTotals),
  );
  check(
    'the household total is unchanged by the removal',
    Object.values(afterTotals).reduce((a, b) => a + b, 0) === 450,
    JSON.stringify(afterTotals),
  );

  const { data: rosterAfter } = await owner
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId);
  check(
    'so the breakdown has a spender who is no longer on the roster',
    (rosterAfter ?? []).every((m) => m.user_id !== memberId),
    JSON.stringify(rosterAfter),
  );

  console.log('\n6. An outsider sees none of it');
  const outsiderEmail = `test-spend-outsider-${suffix}@snapbudget-test.local`;
  const { data: outsiderUser } = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password,
    email_confirm: true,
  });
  const outsider = await signInAs(outsiderEmail);
  const { data: outsiderRows } = await householdMonthExpenses(outsider);
  check("outsider cannot read the household's expenses", (outsiderRows ?? []).length === 0);
  await admin.auth.admin.deleteUser(outsiderUser.user.id);
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
