import { createClient } from '@supabase/supabase-js';

/**
 * Dedicated to E2E runs — never a real household, never real data, safe to
 * wipe after every test. Not `cotetiumadalin@gmail.com` or the other live
 * account on purpose: seeding a session for either would mix test writes
 * into real personal data.
 *
 * `scripts/e2e-account.mjs` reaches this same account for manual/browser
 * testing (plain JS, since scripts/ has no TypeScript runner) — keep the
 * email in sync by hand if it ever changes here.
 */
export const TEST_USER_EMAIL = 'e2e-playwright@snapbudget.test';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — run tests via ' +
        '`npm run test:e2e`, which loads .env.local.',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Creates the test user if it doesn't exist yet; returns its id either way. */
export async function ensureTestUser(): Promise<string> {
  const admin = adminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test' },
  });
  if (created.user) return created.user.id;

  // Already exists from a previous run — look it up instead.
  if (createError?.code !== 'email_exists') {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(`Failed to list users: ${listError.message}`);
  const existing = list.users.find((u) => u.email === TEST_USER_EMAIL);
  if (!existing) throw new Error(`${TEST_USER_EMAIL} reported as existing but not found`);
  return existing.id;
}

/** A single-use token redeemable at /api/test/login — see that route for why. */
export async function loginTokenHash(): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_USER_EMAIL,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(`Failed to generate login link: ${error?.message}`);
  }
  return data.properties.hashed_token;
}

/** Every row this account could own is test data — wipe them all. */
export async function deleteTestUserReceipts(userId: string): Promise<void> {
  const { error } = await adminClient().from('receipts').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to clean up test receipts: ${error.message}`);
}
