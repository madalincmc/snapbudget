import type { Page } from '@playwright/test';
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

/**
 * Signs `page` in as the fixture account.
 *
 * Generating a link invalidates every earlier one for that address, so each
 * spec has to mint its own immediately before redeeming it — sharing one
 * across two specs silently 403s. Reports the route's own body on failure:
 * a bare `toHaveURL` timeout here says only that the URL did not change,
 * which is the least useful half of what went wrong.
 */
export async function signIn(page: Page): Promise<void> {
  const tokenHash = await loginTokenHash();
  const response = await page.goto(`/api/test/login?token_hash=${tokenHash}`);

  if (!page.url().includes('/dashboard')) {
    const body = (await page.textContent('body'))?.trim().slice(0, 200);
    throw new Error(`Test sign-in failed (HTTP ${response?.status()}): ${body}`);
  }
}

/**
 * Seeds a receipt straight into the table, bypassing the forms.
 *
 * The only way to get a row with no `purchase_date` now that both forms
 * refuse to save one — which is exactly the legacy shape the edit screen has
 * to be able to take in hand and correct.
 */
export async function createTestReceipt(
  userId: string,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await adminClient()
    .from('receipts')
    .insert({ user_id: userId, storage_path: null, source: 'receipt', ...row })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Failed to seed receipt: ${error?.message}`);
  return data.id as string;
}

/** Every row this account could own is test data — wipe them all. */
export async function deleteTestUserReceipts(userId: string): Promise<void> {
  const { error } = await adminClient().from('receipts').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to clean up test receipts: ${error.message}`);
}

/**
 * Seeds a personal budget straight into the table.
 *
 * Personal on purpose (`household_id` null): the fixture account's household
 * membership is not something a spec should depend on, and `/budgets` only
 * defaults to the household tab when there is one — `?scope=personal` plus a
 * personal row is the same screen either way.
 */
export async function createTestBudget(
  userId: string,
  budget: { category: string | null; amount: number },
): Promise<string> {
  const { data, error } = await adminClient()
    .from('budgets')
    .insert({ user_id: userId, household_id: null, ...budget })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Failed to seed budget: ${error?.message}`);
  return data.id as string;
}

/** Every budget this account could own is test data — wipe them all. */
export async function deleteTestUserBudgets(userId: string): Promise<void> {
  const { error } = await adminClient().from('budgets').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to clean up test budgets: ${error.message}`);
}
