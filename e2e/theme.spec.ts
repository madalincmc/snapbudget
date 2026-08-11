import { expect, test } from '@playwright/test';

const toggle = /Temă:/;

async function themeState(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    pref: document.documentElement.getAttribute('data-theme-pref'),
  }));
}

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.removeItem('snapbudget:theme'));
    await page.reload();
  });

  test('cycles automatic → light → dark → automatic', async ({ page }) => {
    const button = page.getByRole('button', { name: toggle });

    expect((await themeState(page)).pref).toBe('system');

    await button.click();
    expect(await themeState(page)).toMatchObject({ pref: 'light', theme: 'light' });

    await button.click();
    expect(await themeState(page)).toMatchObject({ pref: 'dark', theme: 'dark' });

    await button.click();
    expect((await themeState(page)).pref).toBe('system');
  });

  test('an explicit choice overrides the operating system', async ({ page }) => {
    // The browser is told it prefers light; picking dark must still win.
    await page.emulateMedia({ colorScheme: 'light' });
    const button = page.getByRole('button', { name: toggle });

    await button.click();
    await button.click();

    expect(await themeState(page)).toMatchObject({ pref: 'dark', theme: 'dark' });
  });

  test('automatic follows the operating system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    expect(await themeState(page)).toMatchObject({ pref: 'system', theme: 'dark' });

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    expect(await themeState(page)).toMatchObject({ pref: 'system', theme: 'light' });
  });

  test('the choice survives a reload without flashing', async ({ page }) => {
    const button = page.getByRole('button', { name: toggle });
    await button.click();
    await button.click();
    expect((await themeState(page)).theme).toBe('dark');

    await page.reload();

    // The inline script runs during head parsing, so the attribute is already
    // correct on the very first evaluation after load — no light frame.
    expect(await themeState(page)).toMatchObject({ pref: 'dark', theme: 'dark' });
  });

  test('the dark variant drives real styles, not just the attribute', async ({ page }) => {
    const readBackground = () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    const light = await readBackground();

    const button = page.getByRole('button', { name: toggle });
    await button.click();
    await button.click();

    expect(await readBackground()).not.toBe(light);
  });
});
