from playwright.sync_api import sync_playwright

def verify_scene():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to match the game resolution (360x640)
        page = browser.new_page(viewport={"width": 360, "height": 640})

        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        page.goto("http://localhost:5173")

        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000)

        # Click "Red" (Index 1)
        # x start 20. + 60 = 80. Center approx 95.
        # y 370. Center approx 380.
        print("Clicking Red...")
        page.mouse.click(95, 380)
        page.wait_for_timeout(500)

        # Click "Attack" (Index 2)
        # x start 20. + 120 = 140. Center approx 160.
        print("Clicking Attack...")
        page.mouse.click(160, 450)
        page.wait_for_timeout(500)

        # Click "Left" (Index 2)
        # x start 20. + 120 = 140. Center approx 160.
        print("Clicking Left...")
        page.mouse.click(160, 520)
        page.wait_for_timeout(500)

        page.screenshot(path="verification_fixed.png")

        browser.close()

if __name__ == "__main__":
    verify_scene()
