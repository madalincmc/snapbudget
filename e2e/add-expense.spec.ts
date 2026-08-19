import { test, expect } from '@playwright/test';
import { ensureTestUser, loginTokenHash, deleteTestUserReceipts } from './test-user';

test.describe('manual expense flow', () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await ensureTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUserReceipts(userId);
  });

  test('adding a manual expense shows up on the dashboard', async ({ page }) => {
    // Starts logged out — a fresh Playwright context carries no cookies.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Log in. See e2e/test-user.ts and app/api/test/login for why this isn't
    // the real "Continuă cu Google" button.
    const tokenHash = await loginTokenHash();
    await page.goto(`/api/test/login?token_hash=${tokenHash}`);
    await expect(page).toHaveURL(/\/dashboard/);

    // Reach the manual-expense form the way a user would: the floating
    // "Adaugă bon" button, then "no receipt" out to the manual form —
    // real link clicks, not a typed URL, so this exercises the same
    // client-side navigation real usage does.
    await page.getByRole('link', { name: 'Adaugă bon' }).click();
    await expect(page).toHaveURL(/\/receipts\/new/);
    // A Base UI Button rendering as a Link still reports role "button", not
    // "link" — see the shadcn/Base UI gotchas noted for this project.
    await page.getByRole('button', { name: 'Nu ai bon? Adaugă manual' }).click();
    await expect(page).toHaveURL(/\/expenses\/new/);

    const merchant = 'CLAUDE-TEST manual expense';
    await page.getByLabel('Sumă (lei) — obligatoriu').fill('33');
    await page.getByLabel('Comerciant / titlu (opțional)').fill(merchant);
    // Date defaults to today; category defaults to "Altele" — both valid as-is.
    await page.getByRole('button', { name: 'Salvează' }).click();

    // The server action redirects to the dashboard on success. Being the
    // only receipt, it's simultaneously the "biggest expense" card and the
    // recent-activity row, so it legitimately appears twice.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(merchant).first()).toBeVisible();
    await expect(page.getByText('33.00').first()).toBeVisible();
  });
});
