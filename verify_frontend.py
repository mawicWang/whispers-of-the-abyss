from playwright.sync_api import sync_playwright

def verify_sprites():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:4173/")

        # Wait for assets to load (looking for game container)
        page.wait_for_selector(".game-container")

        # Wait a bit for sprites to render
        page.wait_for_timeout(2000)

        page.screenshot(path="verification_sprites.png")
        browser.close()

if __name__ == "__main__":
    verify_sprites()
