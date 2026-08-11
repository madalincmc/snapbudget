import { expect, test } from '@playwright/test';
import { FIXTURES } from './seed';

test.describe('history', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history');
  });

  test('lists the seeded expenses', async ({ page }) => {
    await expect(page.getByText(FIXTURES.merchants.groceries)).toBeVisible();
    await expect(page.getByText(FIXTURES.merchants.electronics)).toBeVisible();
    await expect(page.getByText(FIXTURES.merchants.fuel)).toBeVisible();
  });

  test('search narrows the list to one merchant', async ({ page }) => {
    await page.getByPlaceholder(/Caută după comerciant/i).fill('eMAG');

    await expect(page.getByText(FIXTURES.merchants.electronics)).toBeVisible();
    await expect(page.getByText(FIXTURES.merchants.groceries)).toBeHidden();
  });

  test('a search with no matches offers to clear the filters', async ({ page }) => {
    await page.getByPlaceholder(/Caută după comerciant/i).fill('zzzz-nimic');

    await expect(page.getByText(/Nicio cheltuială pentru filtrele alese/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Șterge filtrele/i })).toBeVisible();
  });
});

test.describe('budgets', () => {
  test('shows the seeded limits and their progress', async ({ page }) => {
    await page.goto('/budgets');

    await expect(page.getByText('Buget total lunar')).toBeVisible();
    await expect(page.getByText(new RegExp(`din ${FIXTURES.overallBudget}`))).toBeVisible();
    // The category also appears in the delete button's screen-reader label, so
    // this pins the visible row rather than matching both.
    await expect(page.getByText('Mâncare & Băutură', { exact: true })).toBeVisible();
    await expect(page.getByText(`/ ${FIXTURES.foodBudget} lei`)).toBeVisible();
  });

  test('a new category limit persists', async ({ page }) => {
    await page.goto('/budgets');

    await page.getByLabel(/Limită lunară/i).fill('250');
    await page.getByRole('button', { name: 'Adaugă', exact: true }).click();

    // The action redirects back to /budgets, so the new limit is on the page
    // that follows rather than in place.
    await expect(page.getByText('/ 250 lei')).toBeVisible();
  });
});

test.describe('analytics', () => {
  test('summarises the last twelve months', async ({ page }) => {
    await page.goto('/analytics');

    await expect(page.getByText('Ultimele 12 luni')).toBeVisible();
    await expect(page.getByText(/Medie pe lună/i)).toBeVisible();
    await expect(page.getByText(/Total \d{4}/)).toBeVisible();
  });
});

test.describe('recurring', () => {
  test('lists the seeded rule and can pause it', async ({ page }) => {
    await page.goto('/recurring');

    await expect(page.getByText(FIXTURES.recurringTitle)).toBeVisible();

    await page.getByRole('button', { name: 'Pune pe pauză' }).first().click();

    await expect(page.getByText('Pe pauză')).toBeVisible();
  });
});

test.describe('household', () => {
  test('shows both members', async ({ page }) => {
    await page.goto('/household');

    await expect(page.getByText(FIXTURES.householdName)).toBeVisible();
    await expect(page.getByText(new RegExp(FIXTURES.ownerName))).toBeVisible();
    await expect(page.getByText(FIXTURES.memberName)).toBeVisible();
  });
});
