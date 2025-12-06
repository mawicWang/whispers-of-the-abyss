
from playwright.sync_api import sync_playwright
import time

def verify_assets():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming default Vite port 5173)
        page.goto("http://localhost:5173")

        # Wait for assets to load and canvas to appear
        # The app shows "Loading Assets..." initially
        try:
            page.wait_for_selector("canvas", timeout=10000)
            # Give it a bit more time for rendering
            time.sleep(2)
        except Exception as e:
            print(f"Error waiting for canvas: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            browser.close()
            return

        # Take a screenshot
        page.screenshot(path="verification/asset_verification.png")
        print("Screenshot taken at verification/asset_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_assets()
