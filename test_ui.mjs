import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('Page error:', err);
  });

  // Try both possible URLs
  const urls = [
    'https://sanctuaryreader.pages.dev',
    'https://sanctuary-57r.pages.dev',
  ];

  for (const url of urls) {
    console.log(`\n=== Testing ${url} ===\n`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      console.log('Page loaded successfully');

      // Get page title
      const title = await page.title();
      console.log('Title:', title);

      // Take a screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      const fs = await import('fs');
      fs.writeFileSync(`screenshot_${url.replace(/[^a-z0-9]/gi, '_')}.png`, screenshot);
      console.log('Screenshot saved');

      // Check for some DOM indicators of our changes
      const hasZinc950 = await page.evaluate(() => {
        // Check if any element has background-color matching zinc-950 (rgb(9 9 11) or hsl(210 14% 4%))
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          if (bg === 'rgb(9, 9, 11)' || bg === 'hsl(210, 14%, 4%)') {
            return true;
          }
        }
        return false;
      });
      console.log('Has zinc-950 background:', hasZinc950);

      // Check for absence of em-dashes in visible text
      const hasEmDash = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes('—') || node.textContent.includes('–')) {
            // Ignore if inside a script or style tag
            let parent = node.parentElement;
            while (parent) {
              if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                return false;
              }
              parent = parent.parentElement;
            }
            return true;
          }
        }
        return false;
      });
      console.log('Contains em-dash:', hasEmDash);

      // Check if the service worker is active (from our PWA)
      const swRegistered = await page.evaluate(() => {
        return !!navigator.serviceWorker.controller;
      });
      console.log('Service worker active:', swRegistered);

      // If we found our changes, we can break
      if (hasZinc950 && !hasEmDash) {
        console.log('\n✅ SUCCESS: Our changes are visible!');
        break;
      }
    } catch (err) {
      console.log(`Failed to load ${url}:`, err.message);
    }
  }

  await browser.close();
})();
