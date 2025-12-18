from playwright.sync_api import sync_playwright

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport emulation to match game config
        context = browser.new_context(viewport={'width': 360, 'height': 640})
        page = context.new_page()

        try:
            # Navigate to local server
            page.goto("http://localhost:5173")

            # Wait for main menu
            page.wait_for_selector("text=Demo", timeout=10000)

            # Click Demo button to enter BaseSceneTest
            page.click("text=Demo")

            # Wait for canvas to load
            page.wait_for_selector("canvas", timeout=10000)

            # Wait a bit for assets to render (canvas content)
            page.wait_for_timeout(3000)

            # Take screenshot
            page.screenshot(path="verification/verification_fixed.png")
            print("Screenshot saved to verification/verification_fixed.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_scene()
