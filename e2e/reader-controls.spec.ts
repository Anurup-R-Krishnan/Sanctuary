import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Reader Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('Theme, Font, and Spacing controls apply without crashing', async ({ page }) => {
    await page.goto('/');
    const epubPath = createDummyEpub('reader_controls_test.epub');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(epubPath);

    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible({ timeout: 10000 });

    // Open book
    await page.locator('article', { hasText: /Pride and Prejudice/i }).first().click();

    // Verify reader initializes
    await expect(page.locator('iframe')).toHaveCount(1, { timeout: 10000 });

    // Open Reader Controls/Menu
    // Usually a central click or a specific settings button
    // The reader header has an Appearance icon
    const settingsButton = page.getByRole('button', { name: /Appearance/i }).first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Change to Flow mode
    const flowButton = page.getByRole('button', { name: /Flow/i }).first();
    await flowButton.click();

    // Wait a short moment to ensure no crash
    await page.waitForTimeout(500);

    // Change Font
    const fontSelect = page.locator('select'); // The only select in the dialog
    await fontSelect.selectOption('inter');

    await page.waitForTimeout(500);

    // Close reader
    await page.getByRole('button', { name: /Close|Back/i }).first().click();

    // Make sure we get back to library
    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible();

    fs.unlinkSync(epubPath);
  });
});
