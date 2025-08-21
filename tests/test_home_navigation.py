from playwright.sync_api import Page, expect


class TestHomePage:
    def test_visibility_text(self, page: Page) -> None:
        """Verify key elements are visible and updating the location displays the map and recommendations."""
        # Navigate to the home page
        page.goto("/")

        # Check header link, default sport selection and sport image
        expect(page.get_by_role("link", name="Extreme Heat Tool")).to_be_visible()
        page.wait_for_selector("#id-dropdown-sport", timeout=20_000)
        expect(page.locator("#id-dropdown-sport")).to_be_visible()
        expect(page.locator("#id-dropdown-location")).to_be_visible()

    def test_location_change(self, page: Page) -> None:
        """Test changing the location updates the map and recommendations."""
        # Navigate to the home page
        page.goto("/")

        # Change the location
        page.wait_for_selector("#id-dropdown-location", timeout=20_000)
        page.locator("#id-dropdown-location").click()
        page.locator("#id-dropdown-location").type("2205 arn")
        page.locator("#id-dropdown-location").press("Enter")

        # Wait for the location text to be visible
        page.wait_for_selector("text=Arncliffe, NSW, 2205", timeout=20_000)
        expect(page.get_by_text("Arncliffe, NSW, 2205")).to_be_visible()

        # change back to default location
        page.locator("#id-dropdown-location").click()
        page.locator("#id-dropdown-location").type("2000 sydney")
        page.locator("#id-dropdown-location").press("Enter")

        # Wait for the location text to be visible
        page.wait_for_selector("text=Sydney, NSW, 2000", timeout=20_000)
        expect(page.get_by_text("Sydney, NSW, 2000")).to_be_visible()

    def test_country_change(self, page: Page) -> None:
        """Test changing the country updates the location dropdown."""
        # Navigate to the home page
        page.goto("/")

        # Change the country
        page.locator("#id-button-country").click()
        page.wait_for_selector(
            "#modal-country-select-input", state="visible", timeout=5_000
        )

        page.locator("#modal-country-select-input").dblclick()
        page.locator("#modal-country-select-input").type("Italy")
        page.get_by_text("Italy").click()

        # Wait for the text "Roma, Lazio, 118" to be visible before assertion
        page.wait_for_selector("text=Roma, Lazio, 118", timeout=20_000)
        expect(page.get_by_text("Roma, Lazio, 118")).to_be_visible()

        page.locator("#id-dropdown-location").click()
        page.locator("#id-dropdown-location").type("budrio 40054")
        page.locator("#id-dropdown-location").press("Enter")

        # check that the location is updated
        expect(page.get_by_text("Budrio")).to_be_visible()
