import { expect, test } from '@playwright/test';
import { FIXTURES } from './seed';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('greets the signed-in user and shows the month total', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: FIXTURES.ownerName.split(' ')[0] }),
    ).toBeVisible();

    // 150 + 500 + 200 seeded this month.
    await expect(page.getByText(/Cheltuit în/i)).toBeVisible();
    await expect(page.getByText('850.00')).toBeVisible();
  });

  test('compares against the previous month', async ({ page }) => {
    // 850 this month against 1 200 last month is a fall of about 29%.
    await expect(page.getByText('-29%')).toBeVisible();
    await expect(page.getByText(/față de/i)).toBeVisible();
  });

  test('shows budget progress against the seeded limit', async ({ page }) => {
    // The app groups thousands with a space, so the assertion tolerates
    // whatever whitespace rather than guessing a locale's separator.
    await expect(page.getByText(/Buget\s*3\s*000\s*lei/)).toBeVisible();
    // 850 of 3000, so 28% used and 2 150 left. The figure is part of the
    // assertion because the category rows carry the same wording.
    await expect(page.getByText('28%')).toBeVisible();
    await expect(page.getByText(/Au mai rămas 2\s*150 lei/)).toBeVisible();
  });

  test('breaks spending down by category', async ({ page }) => {
    const breakdown = page.getByText('Pe categorii').locator('..');

    await expect(breakdown.getByText('Cumpărături')).toBeVisible();
    await expect(breakdown.getByText('Transport')).toBeVisible();
    await expect(breakdown.getByText('Mâncare & Băutură')).toBeVisible();
  });

  test('flags a category that is over its limit', async ({ page }) => {
    // 150 spent against a 400 limit on food, so it reports what is left.
    await expect(page.getByText(new RegExp(`Buget ${FIXTURES.foodBudget} lei`))).toBeVisible();
  });

  test('links through to the other screens', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Cheltuieli recurente/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Analiză pe 12 luni/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bugete/i })).toBeVisible();
  });

  test('the bottom nav moves between the main screens', async ({ page }) => {
    await page.getByRole('link', { name: 'Istoric' }).click();
    await expect(page).toHaveURL(/\/history/);

    await page.getByRole('link', { name: 'Gospodărie' }).click();
    await expect(page).toHaveURL(/\/household/);

    await page.getByRole('link', { name: 'Acasă' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('month picker', () => {
  test('steps back a month and re-scopes the page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Luna aceasta')).toBeVisible();

    await page.getByRole('button', { name: 'Luna anterioară' }).click();

    // The selected month rides the URL, so the view is shareable.
    await expect(page).toHaveURL(/\?month=\d{4}-\d{2}/);
    await expect(page.getByText('Luna aceasta')).toBeHidden();

    // Last month's seeded rent, and this month's spending gone.
    await expect(page.getByText('1 200.00')).toBeVisible();
  });

  test('cannot step past the current month', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: 'Luna următoare' })).toBeDisabled();
  });

  test('hides the budget on a past month', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Luna anterioară' }).click();

    // The picker navigates client-side, so wait for the new month to be in the
    // URL before asserting — otherwise this races the render and reads the
    // current month's DOM.
    await expect(page).toHaveURL(/\?month=\d{4}-\d{2}/);

    // A budget row holds today's limit with no history behind it, so measuring
    // a finished month against it would be misleading. toHaveCount(0) rather
    // than toBeHidden: there are two such lines when they do render, and a
    // multiple match is a strict-mode error, not a pass.
    await expect(page.getByText(/^Buget /)).toHaveCount(0);
  });
});
