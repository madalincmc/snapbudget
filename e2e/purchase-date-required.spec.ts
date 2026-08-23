import { test, expect } from '@playwright/test';
import { ensureTestUser, signIn, createTestReceipt, deleteTestUserReceipts } from './test-user';

/**
 * A receipt with no date is invisible: the history filters and sorts on
 * `purchase_date`, so a NULL falls outside every period the reader can pick
 * and sinks to the bottom of the unfiltered list — while the dashboard, which
 * falls back to `created_at`, keeps showing it. Four expenses on one screen,
 * two on the other.
 *
 * The fix is that no form will hand back a dateless row any more. This locks
 * that in on the edit screen, which is both the last stop for an OCR reading
 * and where the pre-existing rows get corrected.
 */
test.describe('purchase date is required', () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await ensureTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUserReceipts(userId);
  });

  test('the edit screen refuses to save a receipt without a date', async ({ page }) => {
    // The shape OCR used to leave behind: everything read except the date.
    const merchant = 'CLAUDE-TEST dateless receipt';
    const receiptId = await createTestReceipt(userId, {
      merchant,
      amount: 99.97,
      purchase_date: null,
      category: 'Altele',
      status: 'processed',
    });

    await signIn(page);
    await page.goto(`/receipts/${receiptId}`);

    const date = page.getByLabel('Data cumpărării — obligatoriu');
    await expect(date).toHaveValue('');

    // Saving as-is is refused by the field itself, so the action never runs
    // and the screen does not move.
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(page).toHaveURL(new RegExp(`/receipts/${receiptId}`));
    expect(await date.evaluate((el) => (el as HTMLInputElement).checkValidity())).toBe(false);

    // With a date on it the same save goes through.
    await date.fill('2026-08-23');
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(merchant).first()).toBeVisible();
  });
});
