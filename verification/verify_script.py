
from playwright.sync_api import sync_playwright

def verify_game_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use --host so it listens on all interfaces if needed, but localhost usually works.
        # Vite dev server usually starts on 5173.
        # Since I started it in background, I need to assume port 5173.
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            # Wait for canvas to be present
            page.wait_for_selector("canvas")
            # Wait for assets to load (AssetLoader logs "Assets loaded successfully")
            # We can wait for a bit to ensure rendering
            page.wait_for_timeout(3000)

            # Take screenshot
            page.screenshot(path="verification/game_screenshot.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_ui()
