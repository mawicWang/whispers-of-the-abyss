from playwright.sync_api import sync_playwright
import time

def verify_animation_viewer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Ensure we wait long enough for the server to start
        context = browser.new_context(viewport={'width': 400, 'height': 700})
        page = context.new_page()

        print("Navigating to page...")
        try:
            page.goto("http://localhost:5173", timeout=60000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            browser.close()
            return

        print("Page loaded. Waiting for canvas...")
        # Wait for the canvas to be present
        try:
            page.wait_for_selector("canvas", timeout=30000)
            print("Canvas found.")
        except:
             print("Canvas not found, saving debug screenshot.")
             page.screenshot(path="verification/debug_fail.png")
             browser.close()
             return

        # Wait a bit for assets to load (AssetLoader)
        print("Waiting for assets to load...")
        time.sleep(5)

        # Take a screenshot of the initial state (Cyan Idle Down)
        print("Taking initial screenshot...")
        page.screenshot(path="verification/verification_initial.png")

        # Interact with the UI to switch to Attack
        # The UI controls are Pixi Text objects with pointer events.
        # Since they are on canvas, we can't select them with DOM selectors easily.
        # However, we can click by coordinates if we know where they are.
        # Action "attack" is the 3rd item.
        # x=20 + 2*60 = 140. y=440.

        print("Clicking 'attack'...")
        page.mouse.click(140 + 20, 440 + 10) # Adding offset to be safe

        time.sleep(1) # Wait for state update

        print("Taking attack screenshot...")
        page.screenshot(path="verification/verification_attack.png")

        browser.close()

if __name__ == "__main__":
    verify_animation_viewer()
