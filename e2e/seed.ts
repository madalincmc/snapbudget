import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

/**
 * Fixture data for the browser suite.
 *
 * Sign-in is Google-only, which no CI browser can complete, so the tests do not
 * log in through the UI. Instead a throwaway user is created through the admin
 * API and its session is handed to Playwright as storage state. The cookie is
 * not hand-built: createServerClient is driven with an in-memory cookie store
 * and whatever it writes is, by construction, exactly what the app writes.
 */

export const PASSWORD = 'E2E-Password-123!';

/** Asserted on by the specs, so they stay readable and independent of totals. */
export const FIXTURES = {
  householdName: 'Gospodărie E2E',
  ownerName: 'Ana Ionescu',
  memberName: 'Radu Ionescu',
  overallBudget: 3000,
  foodBudget: 400,
  merchants: {
    groceries: 'Kaufland E2E',
    electronics: 'eMAG E2E',
    fuel: 'Petrom E2E',
    lastMonth: 'Chirie E2E',
  },
  recurringTitle: 'Netflix E2E',
} as const;

export interface SeededAccount {
  ownerId: string;
  memberId: string;
  ownerEmail: string;
  cookie: { name: string; value: string };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally run the suite through "npm run e2e", which loads .env.local.`,
    );
  }
  return value;
}

function admin() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function dateIn(monthsAgo: number, day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

async function signIn(email: string) {
  const client = createClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client, session: data.session! };
}

export async function seed(): Promise<SeededAccount> {
  const api = admin();
  const stamp = Date.now();
  const ownerEmail = `e2e-owner-${stamp}@snapbudget-e2e.local`;
  const memberEmail = `e2e-member-${stamp}@snapbudget-e2e.local`;

  const { data: ownerUser, error: ownerErr } = await api.auth.admin.createUser({
    email: ownerEmail,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FIXTURES.ownerName },
  });
  if (ownerErr) throw ownerErr;

  const { data: memberUser, error: memberErr } = await api.auth.admin.createUser({
    email: memberEmail,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FIXTURES.memberName },
  });
  if (memberErr) throw memberErr;

  const ownerId = ownerUser.user.id;
  const memberId = memberUser.user.id;

  const owner = await signIn(ownerEmail);
  const member = await signIn(memberEmail);

  const { data: household, error: hErr } = await owner.client
    .from('households')
    .insert({ name: FIXTURES.householdName, owner_id: ownerId })
    .select('id')
    .single();
  if (hErr) throw hErr;
  const householdId = household.id;

  await owner.client.from('household_members').insert({
    household_id: householdId,
    user_id: ownerId,
    role: 'owner',
    display_name: FIXTURES.ownerName,
    email: ownerEmail,
  });
  await owner.client
    .from('household_invitations')
    .insert({ household_id: householdId, email: memberEmail, invited_by: ownerId });

  const { data: invite } = await member.client
    .from('household_invitations')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', memberEmail)
    .single();
  await member.client
    .from('household_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invite!.id);
  await member.client.from('household_members').insert({
    household_id: householdId,
    user_id: memberId,
    role: 'member',
    display_name: FIXTURES.memberName,
    email: memberEmail,
  });

  const expense = (
    merchant: string,
    amount: number,
    date: string,
    category: string,
    subcategory: string,
  ) => ({
    user_id: ownerId,
    household_id: householdId,
    storage_path: null,
    merchant,
    amount,
    purchase_date: date,
    category,
    subcategory,
    status: 'processed',
    source: 'manual',
  });

  // Inserted as the signed-in owner, not through the service role. The app
  // never uses the service role for table access, and the migrations grant
  // receipts only to `authenticated` — hosted Supabase happens to hand
  // service_role broad default privileges, but a stack built from these
  // migrations alone does not, so the shortcut only worked against production.
  const { error: expErr } = await owner.client.from('receipts').insert([
    expense(FIXTURES.merchants.groceries, 150, dateIn(0, 2), 'Mâncare & Băutură', 'Alimente'),
    expense(FIXTURES.merchants.electronics, 500, dateIn(0, 3), 'Cumpărături', 'Electronice'),
    expense(FIXTURES.merchants.fuel, 200, dateIn(0, 4), 'Transport', 'Combustibil'),
    // Previous month, so the comparison line has something to compare against.
    expense(FIXTURES.merchants.lastMonth, 1200, dateIn(1, 10), 'Casă', 'Chirie / Rată'),
  ]);
  if (expErr) throw expErr;

  const { error: budgetErr } = await owner.client.from('budgets').insert([
    { user_id: ownerId, household_id: householdId, category: null, amount: FIXTURES.overallBudget },
    {
      user_id: ownerId,
      household_id: householdId,
      category: 'Mâncare & Băutură',
      amount: FIXTURES.foodBudget,
    },
  ]);
  if (budgetErr) throw budgetErr;

  const { error: recErr } = await owner.client.from('recurring_expenses').insert({
    user_id: ownerId,
    title: FIXTURES.recurringTitle,
    amount: 55.99,
    category: 'Divertisment',
    subcategory: 'Abonamente',
    frequency: 'monthly',
    start_date: dateIn(0, 28),
  });
  if (recErr) throw recErr;

  const written: { name: string; value: string }[] = [];
  const ssr = createServerClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => [],
        setAll: (toSet) => {
          written.push(...toSet.map((c) => ({ name: c.name, value: c.value })));
        },
      },
    },
  );
  await ssr.auth.setSession({
    access_token: owner.session.access_token,
    refresh_token: owner.session.refresh_token,
  });

  if (written.length !== 1) {
    throw new Error(`expected a single auth cookie, got ${written.length}`);
  }

  return { ownerId, memberId, ownerEmail, cookie: written[0] };
}

/** Deleting the users cascades to every row they created. */
export async function teardown(ids: string[]) {
  const api = admin();
  for (const id of ids) {
    await api.auth.admin.deleteUser(id).catch(() => {});
  }
}

/**
 * Removes users left behind by a run that crashed before its teardown. Without
 * this, one hard failure would leak a household into the database on every
 * subsequent push.
 */
export async function sweepOrphans(maxAgeMs = 60 * 60 * 1000) {
  const api = admin();
  const { data, error } = await api.auth.admin.listUsers({ perPage: 200 });
  if (error) return 0;

  const cutoff = Date.now() - maxAgeMs;
  const stale = data.users.filter(
    (u) =>
      /@snapbudget-e2e\.local$/.test(u.email ?? '') && new Date(u.created_at).getTime() < cutoff,
  );

  for (const u of stale) {
    await api.auth.admin.deleteUser(u.id).catch(() => {});
  }
  return stale.length;
}
