from playwright.sync_api import sync_playwright

def verify_back_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")

            # The text might be "Sprites测试" not "Sprites Test"
            # Or use class selector
            page.wait_for_selector(".main-menu-btn")

            # Click the first button (Sprites test)
            page.locator(".main-menu-btn").first.click()

            # Wait for navigation header to appear
            page.wait_for_selector(".nav-header")

            # Wait a bit for assets to load and render
            page.wait_for_timeout(2000)

            # Take screenshot of the header area to see the back button
            page.screenshot(path="verification_files/back_button_check.png")
            print("Screenshot taken.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_back_button()
