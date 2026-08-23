import { test, expect } from '@playwright/test';
import { ensureTestUser, signIn, createTestReceipt, deleteTestUserReceipts } from './test-user';

/**
 * The breakdown shows the top five categories and rolls the rest up behind an
 * "Încă N categorii" disclosure. Opening it revealed the remaining rows as
 * plain text: the link was wired to the visible list only, so a tap on
 * anything past the fifth category did nothing.
 *
 * Seeds seven categories so there are two rows behind the disclosure, and
 * follows one of them through to its screen.
 */
test.describe('category breakdown', () => {
  let userId: string;

  // Descending, so the order on the dashboard is known: the last two fall
  // past VISIBLE_COUNT and end up inside the disclosure.
  const spending = [
    { category: 'Mâncare & Băutură', amount: 700 },
    { category: 'Transport', amount: 600 },
    { category: 'Locuință & Facturi', amount: 500 },
    { category: 'Sănătate & Îngrijire', amount: 400 },
    { category: 'Cumpărături', amount: 300 },
    { category: 'Familie & Educație', amount: 200 },
    { category: 'Divertisment', amount: 100 },
  ];

  test.beforeAll(async () => {
    userId = await ensureTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUserReceipts(userId);
  });

  test('a category behind the disclosure opens its screen', async ({ page }) => {
    // Dated today so they land in the month the dashboard opens on.
    const today = new Date();
    const purchaseDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    for (const { category, amount } of spending) {
      await createTestReceipt(userId, {
        merchant: `CLAUDE-TEST ${category}`,
        amount,
        purchase_date: purchaseDate,
        category,
        status: 'processed',
        source: 'manual',
      });
    }

    await signIn(page);

    // Divertisment is seventh, so it is inside the disclosure and not yet
    // rendered as a link.
    const hiddenRow = page.getByRole('link', { name: 'Divertisment — vezi cheltuielile' });
    await expect(hiddenRow).toBeHidden();

    await page.getByText('Încă 2 categorii').click();
    await expect(hiddenRow).toBeVisible();

    await hiddenRow.click();
    await expect(page).toHaveURL(/\/categories\/fun/);
    await expect(page.getByRole('heading', { name: 'Divertisment' })).toBeVisible();
  });
});
