import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Settings Persistence', () => {
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

  test('Guest mode settings persist across page reload', async ({ page }) => {
    await page.goto('/');
    const epubPath = createDummyEpub('settings_persistence.epub');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(epubPath);

    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible({ timeout: 10000 });

    // Open book
    await page.locator('article', { hasText: /Pride and Prejudice/i }).first().click();

    // Verify reader initializes
    await expect(page.locator('iframe')).toHaveCount(1, { timeout: 10000 });

    const settingsButton = page.getByRole('button', { name: /Appearance/i }).first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Change to Flow mode
    const flowButton = page.getByRole('button', { name: /Flow/i }).first();
    await flowButton.click();
    
    // Select Inter font
    const fontSelect = page.locator('select');
    await fontSelect.selectOption('inter');

    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();

    // Reopen the book
    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible({ timeout: 10000 });
    await page.locator('article', { hasText: /Pride and Prejudice/i }).first().click();

    // Open Settings again
    await expect(page.getByRole('button', { name: /Appearance/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Appearance/i }).first().click();

    // Assert that the Flow option is selected/active
    // The continuous button should have the "bg-white" class or active state when selected
    const flowBtnReloaded = page.getByRole('button', { name: /Flow/i }).first();
    // Assuming the class includes font-medium or similar
    await expect(flowBtnReloaded).toHaveClass(/font-medium/);

    // Assert font is inter
    const fontSelectReloaded = page.locator('select');
    await expect(fontSelectReloaded).toHaveValue('inter');

    fs.unlinkSync(epubPath);
  });
});
