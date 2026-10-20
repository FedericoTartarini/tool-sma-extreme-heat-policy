import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/app/layout/SiteHeader";
import { renderWithAppTheme } from "@/test/layoutTestUtils";

vi.mock("react-i18next", async () => {
  const { layoutI18nMock } = await import("@/test/layoutTestUtils");
  return layoutI18nMock;
});

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
}));

describe("SiteHeader", () => {
  it("renders the USYD logo with responsive sources without lazy loading", () => {
    const markup = renderWithAppTheme(
      <MemoryRouter initialEntries={["/"]}>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(markup).toContain('src="/branding/logo-usyd-black-320.webp"');
    expect(markup).toContain(
      "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w",
    );
    expect(markup).toContain('sizes="6.3209rem"');
    expect(markup).toContain('alt="nav.logoAlt"');
    expect(markup).not.toContain('loading="lazy"');
  });
});
