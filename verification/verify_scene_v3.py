from playwright.sync_api import sync_playwright

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport size to match the app settings
        page = browser.new_page(viewport={'width': 360, 'height': 640})

        try:
            # Navigate to the app (assuming default Vite port)
            page.goto("http://localhost:5173")

            # Wait for the "DEMO" button (NavigationHeader or MainMenu)
            # Actually, defaults to MainMenu. "Demo" button routes to tilemap.
            # Wait for button "Demo"
            page.wait_for_selector("text=Demo", timeout=10000)

            # Click Demo to enter BaseSceneTest
            page.click("text=Demo")

            # Wait for scene to load (look for specific UI elements of BaseSceneTest)
            # The user screenshot showed "20/20" mana text or the donut.
            # Let's wait for the canvas or the donut.
            page.wait_for_timeout(2000) # Give some time for assets to load and render

            # Take a screenshot
            page.screenshot(path="verification/verification_final.png")
            print("Screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_scene()
