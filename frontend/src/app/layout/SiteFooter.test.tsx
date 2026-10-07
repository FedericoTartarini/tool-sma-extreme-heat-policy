import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/app/layout/SiteFooter";
import { renderWithAppTheme } from "@/test/layoutTestUtils";

vi.mock("react-i18next", async () => {
  const { layoutI18nMock } = await import("@/test/layoutTestUtils");
  return layoutI18nMock;
});

describe("SiteFooter", () => {
  it("renders responsive, lazily loaded USYD and SMA logos", () => {
    const markup = renderWithAppTheme(<SiteFooter />);

    expect(markup).toContain('src="/branding/logo-usyd-black-471.webp"');
    expect(markup).toContain(
      "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w, /branding/logo-usyd-black-471.webp 471w",
    );
    expect(markup).toContain('sizes="9.0299rem"');
    expect(markup).toContain('alt="footer.usydLogoAlt"');
    expect(markup).toContain('src="/branding/sma-black-480.webp"');
    expect(markup).toContain(
      "/branding/sma-black-160.webp 160w, /branding/sma-black-320.webp 320w, /branding/sma-black-480.webp 480w",
    );
    expect(markup).toContain('sizes="7.7917rem"');
    expect(markup).toContain('alt="footer.smaLogoAlt"');
    const logoImages = markup.match(/<img\b[^>]*>/g) ?? [];
    expect(logoImages).toHaveLength(2);
    for (const logoImage of logoImages) {
      expect(logoImage).toContain('loading="lazy"');
    }
  });
});
