
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_worker_colors():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the preview server
        await page.goto("http://localhost:4173/")

        # Wait for canvas to load
        await page.wait_for_selector("canvas")

        # Click the "Tile测试" button to go to BaseSceneTest
        # The button text might be different, let's look for buttons
        await page.click("button:has-text('Tile测试')")

        # Wait a bit for entities to spawn and render
        await asyncio.sleep(5)

        # Take a screenshot
        await page.screenshot(path="verification_files/verification_workers_scene.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_worker_colors())
