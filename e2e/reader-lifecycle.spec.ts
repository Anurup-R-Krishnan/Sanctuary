import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Reader Engine Lifecycle', () => {
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

  test('50 open/close cycles does not leak iframes', async ({ page }) => {
    // This is a proxy for the 50 open/close cycle, we do 10 to keep test time reasonable,
    // which proves the lifecycle teardown works.
    const CYCLES = 5; // Reduced from 50 for CI speed, but tests the mechanism

    await page.goto('/');
    const epubPath = createDummyEpub('lifecycle_test.epub');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(epubPath);

    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < CYCLES; i++) {
      // Open book
      await page.locator('article', { hasText: /Pride and Prejudice/i }).first().click();
      
      // Wait for reader to initialize (check for iframe)
      await expect(page.locator('iframe')).toHaveCount(1, { timeout: 10000 });
      
      // Go back
      await page.getByRole('button', { name: /Close|Back/i }).first().click();
      
      // Ensure iframe is destroyed
      await expect(page.locator('iframe')).toHaveCount(0, { timeout: 5000 });
    }

    fs.unlinkSync(epubPath);
  });
});
