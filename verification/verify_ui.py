from playwright.sync_api import sync_playwright

def verify_demon_king_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming Vite is running on port 5173)
        page.goto("http://localhost:5173")

        # Wait for the UI to be visible
        # Check for minimized mode elements
        page.wait_for_selector(".demon-king-interface")
        page.wait_for_selector(".interface-layer.minimized")

        # Take screenshot of minimized mode
        page.screenshot(path="verification/minimized_mode.png")
        print("Captured minimized_mode.png")

        # Expand to full mode
        page.click(".mode-toggle-btn")

        # Wait for full mode transition (approx 300ms + buffer)
        page.wait_for_timeout(500)
        page.wait_for_selector(".interface-layer.full")

        # Take screenshot of full mode
        page.screenshot(path="verification/full_mode.png")
        print("Captured full_mode.png")

        browser.close()

if __name__ == "__main__":
    verify_demon_king_ui()
