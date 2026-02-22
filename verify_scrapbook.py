import asyncio
from playwright.async_api import async_playwright, Route

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Mock the API to return empty list first
        async def handle_empty_library(route: Route):
            await route.fulfill(
                status=200,
                content_type="application/json",
                body='[]'
            )

        # Mock the API to return one book
        async def handle_populated_library(route: Route):
            await route.fulfill(
                status=200,
                content_type="application/json",
                body='''[{
                    "id": "book-1",
                    "title": "Snoopy's Guide to Life",
                    "author": "Charles M. Schulz",
                    "coverUrl": "",
                    "progressPercent": 0,
                    "lastLocation": "",
                    "bookmarks": [],
                    "status": "to-read",
                    "favorite": false,
                    "updatedAt": "2023-10-27T10:00:00Z"
                }]'''
            )

        try:
            # ---------------------------------------------------------
            # TEST 1: Empty State
            # ---------------------------------------------------------
            await page.route("**/api/v2/library", handle_empty_library)

            print("Navigating to homepage (Empty State)...")
            await page.goto("http://localhost:5173")

            # Wait for loading to finish (skeleton to disappear)
            # The empty state text should appear.
            try:
                await page.wait_for_selector("text=The shelves are bare...", timeout=5000)
                print("SUCCESS: Found empty state text 'The shelves are bare...'")
            except:
                print("FAILURE: Did not find empty state text 'The shelves are bare...'")
                await page.screenshot(path="debug_empty_failure.png")

            await page.screenshot(path="library_empty_mocked.png")
            print("Screenshot saved: library_empty_mocked.png")

            # ---------------------------------------------------------
            # TEST 2: Populated State (Bunnies Pick)
            # ---------------------------------------------------------
            print("Reloading with populated library (Bunnies Pick)...")
            # Unroute the previous handler and route the new one
            await page.unroute("**/api/v2/library")
            await page.route("**/api/v2/library", handle_populated_library)

            await page.reload()

            # Wait for Bunnies Pick
            try:
                # "Bunnies Pick" text in h2
                # The component renders "Recommended Reading" and "Bunnies' Choice"
                await page.wait_for_selector("text=Recommended Reading", timeout=5000)
                print("SUCCESS: Found 'Bunnies Pick' section (Recommended Reading)")

                # Check for book title
                if await page.is_visible("text=Snoopy's Guide to Life"):
                    print("SUCCESS: Found book 'Snoopy's Guide to Life'")
                else:
                    print("FAILURE: Did not find book title")
            except Exception as e:
                print(f"FAILURE: Did not find 'Bunnies Pick' section. Error: {e}")
                await page.screenshot(path="debug_populated_failure.png")

            await page.screenshot(path="library_populated_mocked.png")
            print("Screenshot saved: library_populated_mocked.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            await page.screenshot(path="error_fatal.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
