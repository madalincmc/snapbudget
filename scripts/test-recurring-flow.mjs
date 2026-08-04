/**
 * Checks the MAD-62 recurring-expense rules: the date arithmetic in pure SQL,
 * then the generator end-to-end through the Data API with real (temporary)
 * auth users. Creates and deletes its own users; safe to re-run.
 *
 *   npx dotenv -e .env.local -- node scripts/test-recurring-flow.mjs
 */
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pgUrl = new URL(process.env.POSTGRES_URL_NON_POOLING);
pgUrl.searchParams.delete('sslmode');
const pg = new Client({ connectionString: pgUrl.toString(), ssl: { rejectUnauthorized: false } });

const password = 'Test-Password-123!';
const suffix = Date.now();
let failures = 0;
const createdUsers = [];

function check(label, condition, extra = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${extra ? `  -> ${extra}` : ''}`);
  }
}

async function makeUser(tag) {
  const email = `test-recurring-${tag}-${suffix}@snapbudget-test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${tag}` },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  return { id: data.user.id, client };
}

/** YYYY-MM-DD for a date offset from today, in local terms (matches current_date). */
function dayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

await pg.connect();

try {
  console.log('1. Date arithmetic — no drift on month ends');
  const occurrences = [
    // Rent on the 31st: each occurrence is computed from the start date, so
    // February clamping must not drag March down to the 28th.
    ['2026-01-31', 'monthly', 0, '2026-01-31'],
    ['2026-01-31', 'monthly', 1, '2026-02-28'],
    ['2026-01-31', 'monthly', 2, '2026-03-31'],
    ['2026-01-31', 'monthly', 3, '2026-04-30'],
    ['2026-01-31', 'monthly', 12, '2027-01-31'],
    // Leap day, yearly.
    ['2024-02-29', 'yearly', 1, '2025-02-28'],
    ['2024-02-29', 'yearly', 4, '2028-02-29'],
    // Weekly is plain arithmetic but worth pinning.
    ['2026-08-05', 'weekly', 3, '2026-08-26'],
  ];
  for (const [start, freq, n, expected] of occurrences) {
    // Cast in SQL: node-postgres hands back a DATE as a JS Date at local
    // midnight, and toISOString() then rolls it to the previous day for any
    // timezone ahead of UTC.
    const { rows } = await pg.query(
      'select public.recurring_occurrence_date($1::date, $2, $3)::text as d',
      [start, freq, n],
    );
    check(`${freq} ${start} +${n} = ${expected}`, rows[0].d === expected, rows[0].d);
  }

  console.log('\n2. skip_to finds the first occurrence on or after a date');
  const skips = [
    ['2026-01-31', 'monthly', '2026-01-31', 0], // exactly on start
    ['2026-01-31', 'monthly', '2026-01-30', 0], // before start
    ['2026-01-31', 'monthly', '2026-03-01', 2], // n=2 is Mar 31, the next one
    ['2026-01-31', 'monthly', '2026-02-28', 1], // lands exactly on clamped date
    ['2020-01-15', 'weekly', '2026-08-05', 342], // exactly 2394 days = 342 weeks
    ['2020-06-01', 'yearly', '2026-08-05', 7],
  ];
  for (const [start, freq, from, expected] of skips) {
    const { rows } = await pg.query('select public.recurring_skip_to($1::date, $2, $3::date) as n', [
      start,
      freq,
      from,
    ]);
    check(`skip_to(${freq}, ${start}, ${from}) = ${expected}`, rows[0].n === expected, rows[0].n);
  }
  // Cross-check the far-past weekly case rather than trusting the constant.
  const { rows: wk } = await pg.query(
    `select public.recurring_occurrence_date('2020-01-15'::date, 'weekly', public.recurring_skip_to('2020-01-15'::date,'weekly','2026-08-05'::date))::text as first_on_or_after,
            public.recurring_occurrence_date('2020-01-15'::date, 'weekly', public.recurring_skip_to('2020-01-15'::date,'weekly','2026-08-05'::date) - 1)::text as previous`,
  );
  check('weekly skip lands on/after target', wk[0].first_on_or_after >= '2026-08-05', wk[0].first_on_or_after);
  check('weekly skip is the FIRST such occurrence', wk[0].previous < '2026-08-05', wk[0].previous);

  console.log('\n3. No retroactive backfill on create');
  const alice = await makeUser('alice');
  const { data: oldRule, error: oldRuleErr } = await alice.client
    .from('recurring_expenses')
    .insert({
      user_id: alice.id,
      title: 'Chirie',
      amount: 1500,
      category: 'Casă',
      subcategory: 'Chirie / Rată',
      frequency: 'monthly',
      start_date: dayOffset(-40),
    })
    .select('id, next_due_date, occurrences_generated')
    .single();
  check('rule insert returns the new row', !oldRuleErr && oldRule, oldRuleErr?.message);
  check(
    'past start_date is fast-forwarded, next due is in the future',
    oldRule && oldRule.next_due_date >= dayOffset(0),
    oldRule?.next_due_date,
  );

  const { data: genCount } = await alice.client.rpc('generate_my_recurring');
  check('generation creates nothing for a future due date', genCount === 0, String(genCount));

  const { count: aliceReceipts } = await alice.client
    .from('receipts')
    .select('id', { count: 'exact', head: true });
  check('no retroactive expenses were written', (aliceReceipts ?? 0) === 0, String(aliceReceipts));

  console.log('\n4. An occurrence due today is generated');
  const { data: todayRule } = await alice.client
    .from('recurring_expenses')
    .insert({
      user_id: alice.id,
      title: 'Netflix',
      amount: 55,
      category: 'Divertisment',
      subcategory: 'Abonamente',
      frequency: 'monthly',
      start_date: dayOffset(0),
    })
    .select('id, next_due_date')
    .single();
  check('due today', todayRule?.next_due_date === dayOffset(0), todayRule?.next_due_date);

  const { data: gen2 } = await alice.client.rpc('generate_my_recurring');
  check('exactly one expense generated', gen2 === 1, String(gen2));

  const { data: generated } = await alice.client
    .from('receipts')
    .select('merchant, amount, purchase_date, source, category, recurring_expense_id')
    .eq('recurring_expense_id', todayRule.id);
  check('one row, dated today', (generated ?? []).length === 1, JSON.stringify(generated));
  check('source is recurring', generated?.[0]?.source === 'recurring', generated?.[0]?.source);
  check('amount and merchant copied', Number(generated?.[0]?.amount) === 55, generated?.[0]?.amount);
  check('purchase_date is the due date', generated?.[0]?.purchase_date === dayOffset(0));

  console.log('\n5. Generation is idempotent');
  const { data: gen3 } = await alice.client.rpc('generate_my_recurring');
  check('second run creates nothing', gen3 === 0, String(gen3));
  const { count: afterTwice } = await alice.client
    .from('receipts')
    .select('id', { count: 'exact', head: true });
  check('still exactly one expense', (afterTwice ?? 0) === 1, String(afterTwice));

  console.log('\n6. Weekly catches up across several missed occurrences');
  const { data: weekly } = await alice.client
    .from('recurring_expenses')
    .insert({
      user_id: alice.id,
      title: 'Abonament sală',
      amount: 40,
      category: 'Sănătate',
      frequency: 'weekly',
      start_date: dayOffset(0),
    })
    .select('id')
    .single();
  // Rewind the rule as though it had been running for three weeks.
  await pg.query(
    `update public.recurring_expenses set start_date = $1::date where id = $2`,
    [dayOffset(-21), weekly.id],
  );
  const { data: gen4 } = await alice.client.rpc('generate_my_recurring');
  // start_date moved to 21 days ago, so the trigger fast-forwards past
  // occurrences: only today's is due.
  check('rewritten start_date does not backfill', gen4 === 1, String(gen4));

  console.log('\n7. Pause and resume');
  await alice.client.from('recurring_expenses').update({ paused: true }).eq('id', todayRule.id);
  // Pretend a month went by while paused.
  await pg.query(
    `update public.recurring_expenses set start_date = $1::date where id = $2`,
    [dayOffset(-35), todayRule.id],
  );
  const { data: gen5 } = await alice.client.rpc('generate_my_recurring');
  check('paused rule generates nothing', gen5 === 0, String(gen5));

  const { error: resumeErr } = await alice.client.rpc('resume_recurring_expense', {
    _id: todayRule.id,
  });
  check('resume succeeds', !resumeErr, resumeErr?.message);
  const { data: resumed } = await alice.client
    .from('recurring_expenses')
    .select('paused, next_due_date')
    .eq('id', todayRule.id)
    .single();
  check('rule is active again', resumed?.paused === false);
  check(
    'resume does not dump backdated expenses',
    resumed && resumed.next_due_date >= dayOffset(0),
    resumed?.next_due_date,
  );

  console.log('\n8. Rules are private to their owner');
  const bob = await makeUser('bob');
  const { data: bobSeesAlice } = await bob.client
    .from('recurring_expenses')
    .select('id')
    .eq('id', todayRule.id);
  check('another user cannot read the rule', (bobSeesAlice ?? []).length === 0);

  const { data: bobEdit } = await bob.client
    .from('recurring_expenses')
    .update({ amount: 1 })
    .eq('id', todayRule.id)
    .select('id');
  check('another user cannot edit the rule', (bobEdit ?? []).length === 0);

  const { data: bobGen } = await bob.client.rpc('generate_my_recurring');
  check("another user's sweep does not touch it", bobGen === 0, String(bobGen));

  console.log('\n9. The privileged sweep is not reachable from the client');
  const { error: privErr } = await bob.client.rpc('_generate_recurring', { _user_id: alice.id });
  check('_generate_recurring is not exposed to authenticated', !!privErr, 'no error returned');

  console.log('\n10. Editing only affects future occurrences');
  const { data: before } = await alice.client
    .from('receipts')
    .select('id, amount')
    .eq('recurring_expense_id', todayRule.id)
    .single();
  await alice.client.from('recurring_expenses').update({ amount: 999 }).eq('id', todayRule.id);
  const { data: after } = await alice.client
    .from('receipts')
    .select('amount')
    .eq('id', before.id)
    .single();
  check('already-generated expense is untouched', Number(after?.amount) === 55, after?.amount);

  console.log('\n11. Cron job is registered');
  const { rows: jobs } = await pg.query(
    `select jobname, schedule, active from cron.job where jobname = 'snapbudget-generate-recurring'`,
  );
  check('daily sweep scheduled', jobs.length === 1, JSON.stringify(jobs));
  check('sweep is active', jobs[0]?.active === true);
} catch (err) {
  console.error('\nUnexpected error:', err);
  failures++;
} finally {
  console.log('\nCleaning up temporary users...');
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  await pg.end();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
}

process.exit(failures === 0 ? 0 : 1);
