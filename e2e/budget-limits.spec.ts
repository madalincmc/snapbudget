import { test, expect } from '@playwright/test';
import { ensureTestUser, signIn, createTestBudget, deleteTestUserBudgets } from './test-user';

/**
 * Two ways the per-category limits could not be maintained (MAD-121).
 *
 * The bin removed a limit on the first tap, with nothing in between — the one
 * irreversible control on the screen and the easiest to hit by accident on a
 * phone, sitting a few pixels from the row it belongs to. And there was no way
 * to change a limit at all: the "adaugă o limită" form below the list only
 * offers categories that don't have one yet, so correcting 1500 to 1800 meant
 * deleting the limit and setting it up again.
 *
 * Both are driven through `?scope=personal` against a seeded personal budget,
 * so the assertions don't depend on whether the fixture account is in a
 * household. With no receipts seeded, spending is 0 and the row reads
 * "0 / <limit> lei".
 */
test.describe('per-category budget limits', () => {
  let userId: string;

  const CATEGORY = 'Divertisment';

  test.beforeAll(async () => {
    userId = await ensureTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUserBudgets(userId);
  });

  test('deleting a limit asks first, and cancelling keeps it', async ({ page }) => {
    await createTestBudget(userId, { category: CATEGORY, amount: 500 });

    await signIn(page);
    await page.goto('/budgets?scope=personal');

    const row = page.getByText('0 / 500 lei');
    await expect(row).toBeVisible();

    const bin = page.getByRole('button', { name: `Șterge limita pentru ${CATEGORY}` });
    await bin.click();

    // The tap opens a question rather than removing the row underneath it.
    const confirm = page.getByRole('alertdialog');
    await expect(confirm.getByText(`Ștergi limita pentru ${CATEGORY}?`)).toBeVisible();
    await expect(row).toBeVisible();

    await confirm.getByRole('button', { name: 'Anulează' }).click();
    await expect(confirm).toBeHidden();
    await expect(row).toBeVisible();

    // Confirming is what actually deletes it.
    await bin.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Șterge' }).click();
    await expect(row).toBeHidden();
    await expect(bin).toBeHidden();
  });

  test('an existing limit can be changed without deleting it', async ({ page }) => {
    await createTestBudget(userId, { category: CATEGORY, amount: 500 });

    await signIn(page);
    await page.goto('/budgets?scope=personal');

    await expect(page.getByText('0 / 500 lei')).toBeVisible();

    await page.getByRole('button', { name: `Schimbă limita pentru ${CATEGORY}` }).click();

    // Scoped to the dialog: the "adaugă o limită" form below the list carries
    // a field with the same label.
    const dialog = page.getByRole('dialog');
    const amount = dialog.getByLabel('Limită lunară (lei)');
    await expect(amount).toHaveValue('500');

    await amount.fill('750');
    await dialog.getByRole('button', { name: 'Salvează' }).click();

    // The dialog closes itself once the write lands, and the row it edited is
    // still there with the new limit on it.
    await expect(dialog).toBeHidden();
    await expect(page.getByText('0 / 750 lei')).toBeVisible();
    await expect(page.getByText('0 / 500 lei')).toBeHidden();
  });
});
