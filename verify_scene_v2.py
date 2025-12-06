from playwright.sync_api import sync_playwright

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to match the game resolution (360x640)
        # This ensures our clicks map 1:1 to the Pixi application size
        page = browser.new_page(viewport={"width": 360, "height": 640})

        page.goto("http://localhost:5173")

        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000)

        # Click "Red"
        # x = 20 + 1*60 = 80. y = 370.
        page.mouse.click(80, 370)
        page.wait_for_timeout(500)

        # Click "Attack"
        # x = 20 + 2*60 = 140. y = 440.
        page.mouse.click(140, 440)
        page.wait_for_timeout(500)

        # Click "Left"
        # x = 20 + 2*60 = 140. y = 510.
        page.mouse.click(140, 510)
        page.wait_for_timeout(500)

        page.screenshot(path="verification_final.png")

        browser.close()

if __name__ == "__main__":
    verify_scene()
