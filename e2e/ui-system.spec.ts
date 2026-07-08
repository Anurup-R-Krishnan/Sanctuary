import { test, expect } from '@playwright/test';

test.describe('UI System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and IndexedDB
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('Dark mode toggles global HTML class', async ({ page }) => {
    await page.goto('/');
    
    // There should be a generic dark mode toggle in the App navigation (like a Moon/Sun icon)
    // We don't have a backend, so this is guest mode.
    // The main layout usually has a toggle with aria-label="Toggle Theme" or similar
    const themeToggle = page.getByRole('button', { name: /Toggle Theme|Theme/i });
    await expect(themeToggle).toBeVisible();
    
    // Check initial state (default is typically system or light)
    // Click toggle
    await themeToggle.click();

    // Check if html or body gets 'dark' class
    const htmlElement = page.locator('html');
    
    // We will evaluate the classList instead of exact string since there might be other classes
    const hasDark = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDark).toBe(true);
  });
});
