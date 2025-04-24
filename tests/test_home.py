from playwright.sync_api import Page, expect

from my_app.my_classes import Defaults
from my_app.utils import sports_category


class TestHomePage:

    def test_visibility_text(self, page: Page):
        page.goto("/")
        expect(page.get_by_role("link", name="SMA Extreme Heat Policy")).to_be_visible()
        expect(
            page.locator("#id_sport").filter(has_text=Defaults.sport.value.upper())
        ).to_be_visible()
        expect(page.locator("#sport-image").get_by_role("img")).to_be_visible()

        # change the location
        page.locator("#id_postcode").click()
        page.locator("#id_sport").get_by_role("combobox").fill("2205 arn")
        page.locator("#id_sport").get_by_role("combobox").press("Enter")

        expect(page.locator("#map")).to_be_visible()
        expect(page.get_by_role("img", name="Heat stress chart")).to_be_visible()
        expect(page.get_by_role("heading", name="Key recommendations:")).to_be_visible()
        expect(page.get_by_role("button", name="Detailed suggestions:")).to_be_visible()
        expect(
            page.get_by_role("heading", name="Forecasted risk for today")
        ).to_be_visible()
        expect(
            page.get_by_role("link", name="Click here to provide your")
        ).to_be_visible()

    def test_click_dropdown(self, page: Page):
        page.goto("/")
        sports = sports_category.keys()
        drop_down_sport = Defaults.sport.value.upper()
        for sport in sports:
            page.locator("#id_sport").filter(has_text=drop_down_sport).click()
            page.locator("#id_sport").get_by_role("combobox").fill(sport)
            page.locator("#id_sport").get_by_role("combobox").press("Enter")
            expect(page.get_by_role("img", name="Heat stress chart")).to_be_visible()
            drop_down_sport = sport

    def test_selecting_non_existent_sport(self, page: Page):
        page.goto("/")
        page.locator("#react-select-2--value div").filter(
            has_text=Defaults.sport.value.upper()
        ).dblclick()
        page.locator("#react-select-2--value").get_by_role("combobox").fill("fede")
        page.get_by_text("No results found").click()
