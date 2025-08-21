# tests/test_home.py

from playwright.sync_api import Page, expect

expect.set_options(timeout=15_000)


class TestHomePage:
    def test_visibility_text(self, page: Page) -> None:
        """Verify key elements are visible and updating the location displays the map and recommendations."""
        # Navigate to the home page
        page.goto("/")

        # Check header link, default sport selection and sport image
        expect(page.get_by_role("link", name="Extreme Heat Tool")).to_be_visible()
        expect(page.locator("#id-dropdown-sport")).to_be_visible()
        expect(page.locator("#id-sport-image").get_by_role("img")).to_be_visible()

        # Change the location
        page.locator("#id-dropdown-location").click()
        page.locator("#id-dropdown-location").type("2205 arn")
        page.locator("#id-dropdown-location").press("Enter")

        # Validate map and recommendations sections
        expect(page.locator("#id-map")).to_be_visible()
        expect(page.get_by_role("heading", name="Key recommendations:")).to_be_visible()
        expect(page.get_by_role("button", name="Detailed suggestions:")).to_be_visible()
        expect(
            page.get_by_role("heading", name="Forecasted risk for today")
        ).to_be_visible()
        expect(page.locator("#id-button-install")).to_be_visible()
        expect(
            page.get_by_role("link", name="Click here to provide your")
        ).to_be_visible()

    def test_click_dropdown(self, page: Page):
        page.goto("/")
        for sport in ["abseiling", "cricket", "fishing", "running"]:
            page.locator("#id-dropdown-sport").click()
            page.locator("#id-dropdown-sport").get_by_role("combobox").fill(sport)
            page.locator("#id-dropdown-sport").get_by_role("combobox").press("Enter")
            expect(page.get_by_role("img", name="Heat stress chart")).to_be_visible()

    def test_selecting_non_existent_sport(self, page: Page):
        page.goto("/")
        page.locator("#react-select-2--value div").filter(has_text="Soccer").dblclick()
        page.locator("#react-select-2--value").get_by_role("combobox").fill("fede")
        page.get_by_text("No results found").click()
