import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/app/layout/SiteHeader";
import { appTheme } from "@/config/mantineTheme";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      resolvedLanguage: "en",
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
}));

describe("SiteHeader", () => {
  it("renders the USYD logo with responsive sources without lazy loading", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider theme={appTheme}>
        <MemoryRouter initialEntries={["/"]}>
          <SiteHeader />
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(markup).toContain('src="/branding/logo-usyd-black-320.webp"');
    expect(markup).toContain(
      "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w",
    );
    expect(markup).toContain('sizes="102px"');
    expect(markup).toContain('alt="nav.logoAlt"');
    expect(markup).not.toContain('loading="lazy"');
  });
});
