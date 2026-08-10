/**
 * End-to-end check of the MAD-69 monthly_spending RPC, through the real Data
 * API with temporary users. Creates and deletes its own users; safe to re-run.
 *
 *   npx dotenv -e .env.local -- node scripts/test-analytics-flow.mjs
 *
 * The point of interest is that the SQL and lib/dashboard/aggregate.ts must
 * bucket a row into the same month. They use different mechanisms — Postgres
 * date maths vs. slicing an ISO string in JS — so the created_at fallback and
 * the range bounds are where they would silently diverge.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = Date.now();
const ownerEmail = `test-analytics-owner-${suffix}@snapbudget-test.local`;
const memberEmail = `test-analytics-member-${suffix}@snapbudget-test.local`;
const outsiderEmail = `test-analytics-outsider-${suffix}@snapbudget-test.local`;
const password = 'Test-Password-123!';

let ownerId, memberId, outsiderId, householdId;
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

/** Sums the RPC's rows into { 'YYYY-MM': total }. */
function byMonth(rows) {
  const out = {};
  for (const r of rows ?? []) {
    out[r.month] = (out[r.month] ?? 0) + Number(r.total);
  }
  return out;
}

function expense(userId, householdId, overrides) {
  return {
    user_id: userId,
    household_id: householdId,
    storage_path: null,
    merchant: 'Analytics Test',
    category: 'Transport',
    status: 'processed',
    source: 'manual',
    ...overrides,
  };
}

try {
  console.log('Creating temporary Supabase Auth users...');
  for (const [email, name] of [
    [ownerEmail, 'Analytics Owner'],
    [memberEmail, 'Analytics Member'],
    [outsiderEmail, 'Analytics Outsider'],
  ]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw error;
    if (email === ownerEmail) ownerId = data.user.id;
    else if (email === memberEmail) memberId = data.user.id;
    else outsiderId = data.user.id;
  }

  const owner = await signInAs(ownerEmail);
  const member = await signInAs(memberEmail);
  const outsider = await signInAs(outsiderEmail);

  console.log('\n1. Household setup');
  const { data: household, error: householdErr } = await owner
    .from('households')
    .insert({ name: 'Analytics Household', owner_id: ownerId })
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

  console.log('\n2. Expenses across several months');
  const { error: seedErr } = await owner
    .from('receipts')
    .insert([
      expense(ownerId, householdId, { amount: 100, purchase_date: '2026-03-15' }),
      expense(ownerId, householdId, { amount: 50, purchase_date: '2026-03-20', category: 'Casă' }),
      expense(ownerId, householdId, { amount: 200, purchase_date: '2026-04-01' }),
      expense(ownerId, householdId, { amount: 300, purchase_date: '2026-05-31' }),
    ]);
  if (seedErr) fatal('owner seeds expenses', seedErr.message);

  const { error: memberSeedErr } = await member
    .from('receipts')
    .insert([expense(memberId, householdId, { amount: 70, purchase_date: '2026-04-10' })]);
  if (memberSeedErr) fatal('member seeds an expense', memberSeedErr.message);
  check('expenses seeded across March, April and May', true);

  console.log('\n3. Sums are grouped by month and category');
  const { data: ownerRows, error: rpcErr } = await owner.rpc('monthly_spending', {
    _from: '2026-03-01',
    _to: '2026-06-01',
    _user_id: null,
  });
  if (rpcErr) fatal('owner can call monthly_spending', rpcErr.message);

  const ownerTotals = byMonth(ownerRows);
  check(
    'March totals 150 across two categories',
    ownerTotals['2026-03'] === 150,
    JSON.stringify(ownerTotals),
  );
  check(
    'April pools both members (200 + 70)',
    ownerTotals['2026-04'] === 270,
    JSON.stringify(ownerTotals),
  );
  check('May totals 300', ownerTotals['2026-05'] === 300, JSON.stringify(ownerTotals));

  const marchCategories = (ownerRows ?? []).filter((r) => r.month === '2026-03');
  check(
    'March is split into Transport and Casă',
    marchCategories.length === 2 &&
      marchCategories.some((r) => r.category === 'Transport' && Number(r.total) === 100) &&
      marchCategories.some((r) => r.category === 'Casă' && Number(r.total) === 50),
    JSON.stringify(marchCategories),
  );

  console.log('\n4. Range bounds: _from inclusive, _to exclusive');
  const { data: aprilOnly } = await owner.rpc('monthly_spending', {
    _from: '2026-04-01',
    _to: '2026-05-01',
    _user_id: null,
  });
  const aprilTotals = byMonth(aprilOnly);
  check(
    'a single-month window excludes the neighbouring months',
    Object.keys(aprilTotals).length === 1 && aprilTotals['2026-04'] === 270,
    JSON.stringify(aprilTotals),
  );

  // 31 May sits on the exclusive bound of a 1 June cutoff, so it must be in;
  // an off-by-one here would silently drop the last day of every window.
  const { data: throughMay } = await owner.rpc('monthly_spending', {
    _from: '2026-05-01',
    _to: '2026-06-01',
    _user_id: null,
  });
  check(
    'the last day of the month is inside the window',
    byMonth(throughMay)['2026-05'] === 300,
    JSON.stringify(byMonth(throughMay)),
  );

  console.log('\n5. _user_id narrows to one member');
  const { data: memberOnly } = await owner.rpc('monthly_spending', {
    _from: '2026-03-01',
    _to: '2026-06-01',
    _user_id: memberId,
  });
  const memberTotals = byMonth(memberOnly);
  check(
    'filtering by the member returns only their expense',
    Object.keys(memberTotals).length === 1 && memberTotals['2026-04'] === 70,
    JSON.stringify(memberTotals),
  );

  console.log('\n6. The created_at fallback matches the JS bucketing');
  // No purchase_date, so the row falls back to created_at. A UTC timestamp
  // late on the last day of a month is where a server-timezone cast would
  // push it into the next month; the SQL pins the cast to UTC to match the
  // JS side, which slices the ISO string.
  const { error: fallbackErr } = await owner.from('receipts').insert(
    expense(ownerId, householdId, {
      amount: 11,
      purchase_date: null,
      created_at: '2026-02-28T23:30:00.000Z',
    }),
  );
  if (fallbackErr) fatal('insert a row with no purchase_date', fallbackErr.message);

  const { data: febRows } = await owner.rpc('monthly_spending', {
    _from: '2026-02-01',
    _to: '2026-03-01',
    _user_id: null,
  });
  check(
    'a row without purchase_date is bucketed by its UTC created_at',
    byMonth(febRows)['2026-02'] === 11,
    JSON.stringify(byMonth(febRows)),
  );

  console.log('\n7. Row-level security still applies (security invoker)');
  const { data: outsiderRows, error: outsiderErr } = await outsider.rpc('monthly_spending', {
    _from: '2026-01-01',
    _to: '2027-01-01',
    _user_id: null,
  });
  check('an outsider can call the function', !outsiderErr, outsiderErr?.message);
  check(
    'but sees none of the household spending',
    (outsiderRows ?? []).length === 0,
    JSON.stringify(outsiderRows),
  );

  // Naming another user must not be a way around RLS.
  const { data: outsiderProbe } = await outsider.rpc('monthly_spending', {
    _from: '2026-01-01',
    _to: '2027-01-01',
    _user_id: ownerId,
  });
  check(
    "naming another user's id does not expose their expenses",
    (outsiderProbe ?? []).length === 0,
    JSON.stringify(outsiderProbe),
  );

  console.log('\n8. Pending and amount-less rows are excluded');
  await owner.from('receipts').insert([
    expense(ownerId, householdId, {
      amount: 500,
      purchase_date: '2026-05-10',
      status: 'pending',
    }),
    expense(ownerId, householdId, { amount: null, purchase_date: '2026-05-11' }),
  ]);
  const { data: afterNoise } = await owner.rpc('monthly_spending', {
    _from: '2026-05-01',
    _to: '2026-06-01',
    _user_id: null,
  });
  check(
    'May is still 300 — unprocessed and amount-less rows are ignored',
    byMonth(afterNoise)['2026-05'] === 300,
    JSON.stringify(byMonth(afterNoise)),
  );
} catch (err) {
  if (!String(err.message).startsWith('aborting:')) {
    console.error('\nUnexpected error:', err);
    failures++;
  }
} finally {
  console.log('\nCleaning up temporary users (cascades to their data)...');
  for (const id of [ownerId, memberId, outsiderId]) {
    if (id) await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
}

process.exit(failures === 0 ? 0 : 1);
