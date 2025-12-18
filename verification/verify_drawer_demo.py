from playwright.sync_api import sync_playwright

def verify_character_drawer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport
        context = browser.new_context(viewport={'width': 360, 'height': 640})
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173/")
            page.wait_for_selector(".main-menu-btn")
            print("Clicking Demo...")
            page.click("text=Demo")
            page.wait_for_selector("canvas")

            print("Waiting for scene to stabilize...")
            page.wait_for_timeout(4000)

            found = False
            # Search near farm for worker (bottom center area)
            print("Searching for worker...")
            for x in range(160, 220, 15):
                for y in range(480, 540, 15):
                    page.mouse.click(x, y)
                    page.wait_for_timeout(200)
                    content = page.content()
                    # Check for "武力" (Worker attribute)
                    if "武力" in content:
                        print(f"Worker found at {x}, {y}")
                        found = True
                        break
                if found: break

            if not found:
                 print("Worker not found. Clicking House fallback...")
                 # Try clicking a house
                 page.mouse.click(200, 220)
                 page.wait_for_timeout(500)

            page.screenshot(path="verification/drawer_final.png")
            print("Screenshot saved to verification/drawer_final.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_character_drawer()
