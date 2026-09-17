import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/app/layout/SiteFooter";
import { appTheme } from "@/config/mantineTheme";

vi.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("SiteFooter", () => {
  it("renders responsive, lazily loaded USYD and SMA logos", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider theme={appTheme}>
        <SiteFooter />
      </MantineProvider>,
    );

    expect(markup).toContain('src="/branding/logo-usyd-black-320.webp"');
    expect(markup).toContain(
      "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w",
    );
    expect(markup).toContain('sizes="145px"');
    expect(markup).toContain('alt="footer.usydLogoAlt"');
    expect(markup).toContain('src="/branding/sma-black-320.webp"');
    expect(markup).toContain(
      "/branding/sma-black-160.webp 160w, /branding/sma-black-320.webp 320w",
    );
    expect(markup).toContain('sizes="125px"');
    expect(markup).toContain('alt="footer.smaLogoAlt"');
    expect(markup).toContain('loading="lazy"');
  });
});
