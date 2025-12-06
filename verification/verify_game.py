from playwright.sync_api import sync_playwright

def verify_game_state():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Subscribe to console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        try:
            page.goto("http://localhost:3001")

            # Wait for canvas to be present
            page.wait_for_selector("canvas", timeout=10000)

            # Wait a bit for assets to load (AssetLoader)
            page.wait_for_timeout(5000)

            # Take screenshot of the initial state
            page.screenshot(path="verification/verification.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_state()
