
from playwright.sync_api import sync_playwright

def verify_guard_spawn():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 360, 'height': 640})
        page = context.new_page()

        try:
            # Navigate to the game (Vite default port 5173)
            page.goto("http://localhost:5173")

            # Wait for canvas to load
            page.wait_for_selector("canvas", timeout=10000)

            # Click on "Demo" button in the menu (if it exists)
            # Based on memory: "MainMenu" routes to BaseSceneTest via "Demo" button
            # Need to find button with text "Demo"

            # Wait a bit for menu to appear
            page.wait_for_timeout(2000)

            demo_btn = page.get_by_text("Demo")
            if demo_btn.is_visible():
                demo_btn.click()
                print("Clicked Demo button")
            else:
                print("Demo button not found, maybe already in scene?")

            # Wait for scene to load and entities to spawn
            page.wait_for_timeout(5000)

            # Take screenshot
            page.screenshot(path="verification_files/guard_spawn_verification.png")
            print("Screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_guard_spawn()
