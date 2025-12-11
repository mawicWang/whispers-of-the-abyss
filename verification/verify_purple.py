from playwright.sync_api import sync_playwright

def verify_purple_follower():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE_ERROR: {exc}"))

        # Navigate to the app (assuming default vite port)
        page.goto("http://localhost:5173/")

        # Wait for canvas to load
        page.wait_for_selector("canvas", timeout=10000)

        # Click the "Tile测试"
        try:
            page.get_by_text("Tile测试").click(timeout=5000)
        except:
             print("Could not find 'Tile测试' button, taking screenshot of menu")
             page.screenshot(path="verification/menu_fail.png")
             browser.close()
             return

        # Wait for scene to load
        page.wait_for_timeout(3000)

        # Take screenshot
        page.screenshot(path="verification/purple_check.png")
        browser.close()

if __name__ == "__main__":
    verify_purple_follower()
