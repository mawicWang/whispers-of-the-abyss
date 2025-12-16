from playwright.sync_api import Page, expect, sync_playwright
import time

def test_background(page: Page):
    # Go to app
    page.goto("http://localhost:5173")

    # Wait for loading screen to disappear
    # MainMenu has buttons. Let's wait for a button with text "Tile测试"
    # Or just wait for the game-container to be visible and not show "Loading"

    # Try to find the button
    tile_btn = page.get_by_text("Tile测试")
    expect(tile_btn).to_be_visible(timeout=10000)

    # Click it
    tile_btn.click()

    # Now we are in BaseSceneTest.
    # Wait a bit for the background texture to load and render
    # There is no easy DOM element to check for Pixi canvas content,
    # but we can wait for the 'Base Scene Test' header or similar

    header = page.get_by_text("Base Scene Test")
    expect(header).to_be_visible()

    # Wait for assets to load in the scene (Background texture is loaded in useEffect)
    # Give it a couple of seconds for the TilingSprite to appear
    time.sleep(2)

    # Screenshot
    page.screenshot(path="verification/background.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_background(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
