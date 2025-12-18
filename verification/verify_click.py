from playwright.sync_api import sync_playwright

def verify_click_behavior():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use mobile emulation to match the viewport settings
        context = browser.new_context(viewport={'width': 360, 'height': 640})
        page = context.new_page()

        # Navigate to the game
        page.goto("http://localhost:5173/")

        # Wait for canvas to load
        page.wait_for_selector("canvas")

        # 1. Click 'Demo' button to enter GameScene
        # The menu might be an overlay. Let's find "Demo" text.
        page.get_by_text("Demo").click()

        # Wait for scene to load (look for specific UI elements like Mana bar or known entities)
        # We can wait for the mana bar text or suspicion gauge
        page.wait_for_timeout(2000)

        # 2. Simulate a click (down + up at same pos) on an empty area
        # Center of screen is likely empty or has entities.
        # Let's try to click somewhere safe, maybe top left corner (10, 10)
        page.mouse.move(10, 10)
        page.mouse.down()
        page.mouse.up()

        # This should trigger deselect (if anything was selected, or just ensure no error)
        page.wait_for_timeout(500)

        # 3. Simulate a drag (down -> move -> up)
        # Start at 100, 100
        page.mouse.move(100, 100)
        page.mouse.down()
        # Drag to 150, 150
        page.mouse.move(150, 150, steps=5)
        page.mouse.up()

        # If logic is correct, this should NOT trigger a "click" event handler (no selection/deselection logic run)
        # Hard to verify internal state from screenshot alone, but we can verify app is still responsive

        page.screenshot(path="verification/verification.png")
        print("Verification script ran successfully.")

        browser.close()

if __name__ == "__main__":
    verify_click_behavior()
