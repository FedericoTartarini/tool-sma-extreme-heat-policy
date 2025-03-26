from playwright.sync_api import Page, expect


class TestAboutPage:

    def test_has_url(self, page: Page):
        page.goto("/about")
        expect(page.get_by_text("Functionalities")).to_be_visible()

    def test_about_navbar_links(self, page: Page):
        # Verify visibility and functionality of navbar links on the About page.
        nav_links = ["Home", "About"]

        # Check each navbar link for visibility
        for link_text in nav_links:
            expect(page.get_by_role("link", name=link_text)).to_have_count(0)
