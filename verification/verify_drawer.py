from playwright.sync_api import sync_playwright

def verify_character_drawer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to match the user's mobile-like context and test the constraints
        context = browser.new_context(viewport={'width': 360, 'height': 640})
        page = context.new_page()

        try:
            # 1. Load the page
            page.goto("http://localhost:5173/")

            # 2. Wait for the game to load (canvas element)
            page.wait_for_selector("canvas")

            # 3. Wait a bit for entities to spawn and render
            page.wait_for_timeout(3000)

            # 4. Click on the center of the screen where a worker likely is (or just click randomly to select something)
            # The user provided screenshot shows "worker-1".
            # In BaseSceneTest, workers are spawned.
            # We can try to click coordinates (center).
            page.mouse.click(180, 320)

            # 5. Wait for drawer to appear. It appears if an entity is selected.
            # We can check if the text "Worker" or "武力" appears.
            try:
                # Wait for "武力" text which confirms the drawer is open and updated
                page.wait_for_selector("text=武力", timeout=5000)
                print("Drawer opened successfully.")
            except:
                print("Drawer didn't open on first click, trying another spot...")
                # Try clicking another spot if first failed (maybe missed entity)
                page.mouse.click(200, 340)
                page.wait_for_timeout(1000)

            # 6. Take screenshot
            page.screenshot(path="verification/drawer_verification.png")
            print("Screenshot saved to verification/drawer_verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_character_drawer()
