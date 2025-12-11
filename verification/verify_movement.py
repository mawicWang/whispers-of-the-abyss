import time
from playwright.sync_api import sync_playwright

def test_movement(page):
    # Go to local server
    page.goto("http://localhost:5173")

    # Wait for canvas
    page.wait_for_selector("canvas", timeout=10000)

    # Wait for game to load (give it a few seconds for assets)
    time.sleep(3)

    # Take screenshot
    page.screenshot(path="verification/movement_test.png")
    print("Screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_movement(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
