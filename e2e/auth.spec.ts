import { expect, test } from '@playwright/test';

// These cases are about *not* being signed in, so they discard the shared
// session rather than using it.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('signed out', () => {
  test('the login screen offers Google sign-in', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('SnapBudget')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuă cu Google/i })).toBeVisible();
  });

  test('protected routes redirect to login and keep the destination', async ({ page }) => {
    await page.goto('/budgets');

    await expect(page).toHaveURL(/\/login\?.*next=%2Fbudgets/);
  });

  // Every signed-in route redirects, and each one keeps where the user was
  // going — the proxy's prefix list has been missing entries before.
  for (const path of ['/dashboard', '/history', '/household', '/recurring', '/analytics']) {
    test(`${path} redirects to login with a return path`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(new RegExp(`/login\\?.*next=${encodeURIComponent(path)}`));
    });
  }
});
