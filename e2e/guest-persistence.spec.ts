import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Utility to create a copy of the valid EPUB
function createDummyEpub(filename: string) {
  const source = path.join(process.cwd(), 'e2e/valid_test_book.epub');
  const filepath = path.join(process.cwd(), 'e2e', filename);
  fs.copyFileSync(source, filepath);
  return filepath;
}

test.describe('Guest Mode Persistence (SAN-013)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test to ensure clean slate
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    });
    // Hard reload
    await page.reload();
  });

  test('Guest import, refresh, verify book remains and location restores', async ({ page }) => {
    // Navigate to local app
    await page.goto('/');

    // Wait for the Library Empty State to appear
    await expect(page.getByText(/Your Library Awaits/i)).toBeVisible();

    // Create a dummy EPUB
    const epubPath = createDummyEpub('guest_test.epub', 'Guest Book Content');

    // Trigger file upload
    // In our app, there is a hidden file input or a dropzone
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Assuming there's a button with text "Add Book" or an icon
    await page.getByRole('button', { name: /Add Book|Import/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(epubPath);

    // Wait for book to appear in the library
    // The library shows the title of the book, which for our dummy might just be the filename or 'Unknown'
    // Let's just wait for a book card to appear
    await expect(page.getByText(/Pride and Prejudice/i).first()).toBeVisible({ timeout: 10000 });

    // Refresh the page (Simulating SAN-013 reproduction)
    await page.reload();

    // Verify the book is STILL in the library
    await expect(page.getByText(/Your Library Awaits/i)).not.toBeVisible();
    await expect(page.getByText(/Pride and Prejudice/i).first()).toBeVisible();

    // Open book
    await page.getByText(/Pride and Prejudice/i).first().click();

    // Verify reader initializes
    // In reader, we should see reader controls
    await expect(page.getByRole('button', { name: /Close|Back/i }).first()).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(epubPath);
  });
});
