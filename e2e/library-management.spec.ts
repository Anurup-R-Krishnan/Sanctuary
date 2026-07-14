import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Library Management', () => {
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

  test('Delete book removes it from DOM and store', async ({ page }) => {
    await page.goto('/');
    const epubPath = createDummyEpub('library_test.epub');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(epubPath);

    const bookLocator = page.locator('article', { hasText: /Pride and Prejudice/i });
    await expect(bookLocator.first()).toBeVisible({ timeout: 10000 });

    // Click Delete
    // The Delete button has aria-label="Delete book"
    const deleteButton = bookLocator.first().getByRole('button', { name: /Delete book/i });
    await deleteButton.click();

    // It pops up a ConfirmDialog, so we need to confirm
    const confirmButton = page.getByRole('button', { name: /Delete|Confirm/i }).last();
    await confirmButton.click();

    // Wait for it to disappear
    await expect(bookLocator).toHaveCount(0, { timeout: 10000 });

    fs.unlinkSync(epubPath);
  });
});
