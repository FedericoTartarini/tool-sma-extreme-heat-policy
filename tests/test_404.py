from playwright.sync_api import Page, expect


class Test404Page:

    def test_404(self, page: Page):
        page.goto("/aboutoek")
        expect(page.get_by_text("This page does not exists")).to_be_visible()
