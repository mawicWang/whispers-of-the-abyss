from playwright.sync_api import sync_playwright

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (default Vite port)
        page.goto("http://localhost:5173")

        # Wait for the scene to load (check for "Character Viewer" text)
        # Note: Canvas rendering means we might not see DOM elements for text easily if they are PixiText,
        # but the UI buttons I added use 'eventMode' on Pixi objects.
        # Wait, Pixi objects are not DOM elements. Playwright sees the <canvas>.
        # However, I did not add HTML buttons, I added Pixi Text buttons.
        # Playwright cannot click Pixi objects directly via DOM selectors.

        # Strategy:
        # 1. Wait for canvas.
        # 2. Click at specific coordinates where the buttons are known to be.
        # Color buttons: y=370, x starts at 20, spaced 60.
        # Actions: y=440
        # Directions: y=510

        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000) # Wait for assets to load

        # Take initial screenshot (Cyan, Idle, Down)
        page.screenshot(path="verification_initial.png")

        # Click "Red" (2nd color)
        # x = 20 + 1*60 = 80. y = 370.
        page.mouse.click(80, 370)
        page.wait_for_timeout(500)
        page.screenshot(path="verification_red.png")

        # Click "Attack" (3rd action)
        # x = 20 + 2*60 = 140. y = 440.
        page.mouse.click(140, 440)
        page.wait_for_timeout(500)
        page.screenshot(path="verification_red_attack.png")

        # Click "Left" (3rd direction)
        # x = 20 + 2*60 = 140. y = 510.
        page.mouse.click(140, 510)
        page.wait_for_timeout(500)
        page.screenshot(path="verification_red_attack_left.png")

        browser.close()

if __name__ == "__main__":
    verify_scene()
