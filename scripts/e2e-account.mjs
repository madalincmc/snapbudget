import { createClient } from '@supabase/supabase-js';

// Kept in sync by hand with e2e/test-user.ts — that file can't be run by
// plain `node` (it's TypeScript, and this project intentionally has no
// ts-node/tsx step for scripts/), so this is a separate, plain-JS way to
// reach the same fixture account for manual/browser-driven testing.
const TEST_USER_EMAIL = 'e2e-playwright@snapbudget.test';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Run via: npx dotenv -e .env.local -- node scripts/e2e-account.mjs');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureTestUser(admin) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test' },
  });
  if (created.user) return created.user.id;

  if (error?.code !== 'email_exists') {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(`Failed to list users: ${listError.message}`);
  const existing = list.users.find((u) => u.email === TEST_USER_EMAIL);
  if (!existing) throw new Error(`${TEST_USER_EMAIL} reported as existing but not found`);
  return existing.id;
}

const admin = adminClient();
const command = process.argv[2];

if (command === 'cleanup') {
  const userId = await ensureTestUser(admin);
  const { error, count } = await admin
    .from('receipts')
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (error) throw new Error(`Cleanup failed: ${error.message}`);
  console.log(`Deleted ${count ?? 0} receipt(s) for ${TEST_USER_EMAIL}.`);
} else {
  await ensureTestUser(admin);
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_USER_EMAIL,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(`Failed to generate login link: ${error?.message}`);
  }
  console.log(`http://localhost:3000/api/test/login?token_hash=${data.properties.hashed_token}`);
}
