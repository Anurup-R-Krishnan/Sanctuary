import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Duplicate Protection (INV-LIB-001)', () => {
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

  test('Import EPUB A, Import EPUB A again, verify exactly one logical item', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Your Library Awaits/i)).toBeVisible();

    const epubPath = createDummyEpub('book_a.epub');
    const renamedEpubPath = createDummyEpub('book_a_renamed.epub'); // identical content, different name

    // 1st Import
    const fileChooserPromise1 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser1 = await fileChooserPromise1;
    await fileChooser1.setFiles(epubPath);

    // Wait for the book to appear
    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible({ timeout: 10000 });
    const bookCountAfterFirst = await page.locator('article', { hasText: /Pride and Prejudice/i }).count();
    expect(bookCountAfterFirst).toBe(1);

    // 2nd Import (Identical File)
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    // There might be a floating action button for adding more books once library is not empty
    // We will look for an SVG/button with label "Add Book" or similar.
    // If not visible, we can evaluate a script to trigger the upload, or find the fab
    // The web app has a Floating Action Button in the corner
    const fab = page.locator('button[aria-label="Add book"], button[aria-label="Import"], .fixed.bottom-6.right-6 button').first();
    await fab.click();
    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles(epubPath);

    // Give it a moment to process the duplicate rejection
    await page.waitForTimeout(2000);

    // Count should still be 1
    const bookCountAfterSecond = await page.locator('article', { hasText: /Pride and Prejudice/i }).count();
    expect(bookCountAfterSecond).toBe(1);

    // 3rd Import (Renamed Identical File)
    const fileChooserPromise3 = page.waitForEvent('filechooser');
    await fab.click();
    const fileChooser3 = await fileChooserPromise3;
    await fileChooser3.setFiles(renamedEpubPath);

    await page.waitForTimeout(2000);
    const bookCountAfterThird = await page.locator('article', { hasText: /Pride and Prejudice/i }).count();
    expect(bookCountAfterThird).toBe(1);

    // Refresh and check
    await page.reload();
    await expect(page.locator('article', { hasText: /Pride and Prejudice/i }).first()).toBeVisible();
    expect(await page.locator('article', { hasText: /Pride and Prejudice/i }).count()).toBe(1);

    fs.unlinkSync(epubPath);
    fs.unlinkSync(renamedEpubPath);
  });
});
