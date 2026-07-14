import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Reader DOM Stability', () => {
    test('font size changes do not unmount iframe and apply correct CSS', async ({ page }) => {
        // Go to local dev server
        await page.goto('http://localhost:5174');

        // Wait for hydration and library to load
        await page.waitForSelector('text=Library', { timeout: 10000 });

        // Upload mobydick.epub
        const filePath = path.resolve('mobydick.epub');
        
        // Playwright's setInputFiles works even on hidden inputs
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for book to appear in the library
        // We look for Moby Dick text or just click the first book cover
        await page.waitForSelector('text=Moby', { timeout: 15000 });
        
        const bookSelector = 'button:has-text("Moby")';
        await page.click(bookSelector);

        // Wait for reader engine to be ready
        await page.waitForSelector('iframe', { timeout: 15000 });
        
        // Wait a bit for the epub to fully render
        await page.waitForTimeout(5000);

        // Get the initial iframe element reference
        const iframeElement = await page.$('iframe');
        expect(iframeElement).not.toBeNull();

        // Inject MutationObserver into the parent window to watch for iframe unmounts/remounts
        await page.evaluate(() => {
            window.__domLogs = [];
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeName === 'IFRAME') window.__domLogs.push('IFRAME_ADDED');
                    });
                    m.removedNodes.forEach(node => {
                        if (node.nodeName === 'IFRAME') window.__domLogs.push('IFRAME_REMOVED');
                    });
                });
            });
            // Observe the container of the iframe
            const container = document.querySelector('iframe')?.parentElement;
            if (container) {
                observer.observe(container, { childList: true, subtree: true });
            }
        });

        // Open settings UI (click center of screen to show UI if hidden, then click settings)
        await page.mouse.click(200, 200);
        await page.waitForTimeout(500); // Wait for UI transition
        
        // Click the Appearance/Settings button (the one with the Settings icon)
        await page.click('button[aria-label="Appearance"], button[title="Appearance"], button:has(svg.lucide-settings)');

        // Wait for settings panel to appear
        await page.waitForSelector('text=Typography');

        // Find the font size slider (min=14, max=30)
        const sizeSlider = await page.$('input[type="range"][min="14"][max="30"]');
        expect(sizeSlider).not.toBeNull();

        // Change the font size to 24
        await sizeSlider?.fill('24');
        
        // Find the Width slider (min=50, max=150)
        const widthSlider = await page.$('input[type="range"][min="50"][max="150"]');
        expect(widthSlider).not.toBeNull();
        
        // Change the width to 120
        await widthSlider?.fill('120');

        // Wait for changes to propagate
        await page.waitForTimeout(1000);

        // Verify the DOM logs - there should be NO iframe removed or added events
        const domLogs = await page.evaluate(() => window.__domLogs);
        expect(domLogs).not.toContain('IFRAME_REMOVED');
        expect(domLogs).not.toContain('IFRAME_ADDED');

        // Verify that the iframe's internal HTML/CSS updated
        // Read the internal iframe DOM using Playwright
        const iframeFrame = await iframeElement!.contentFrame();
        expect(iframeFrame).not.toBeNull();

        // Get the computed style of the body inside the iframe to verify font size and width
        const bodyStyles = await iframeFrame!.evaluate(() => {
            const body = document.body;
            const computed = window.getComputedStyle(body);
            return {
                fontSize: computed.fontSize,
                maxWidth: computed.maxWidth,
                paddingLeft: computed.paddingLeft
            };
        });

        // Output results to console so we can see the exact values
        console.log('--- TEST EVIDENCE ---');
        console.log(`Iframe Remounts: ${domLogs.length} (Expected: 0)`);
        console.log(`Computed font-size inside EPUB: ${bodyStyles.fontSize} (Expected: 24px)`);
        console.log(`Computed max-width inside EPUB: ${bodyStyles.maxWidth}`);
        console.log('---------------------');
        
        expect(bodyStyles.fontSize).toBe('24px');
    });
});
