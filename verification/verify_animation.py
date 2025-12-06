from playwright.sync_api import sync_playwright, expect
import time

def verify_animation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:3000")

        # Wait for canvas to be present
        page.wait_for_selector("canvas")

        # Wait a bit for assets to load and animations to start
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="verification/animation_scene.png")

        browser.close()

if __name__ == "__main__":
    verify_animation()
