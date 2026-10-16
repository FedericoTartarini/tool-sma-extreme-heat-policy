import { describe, expect, it } from "vitest";
import { BRANDING_ASSETS } from "@/domain/brandingAssets";
import { expectResponsiveImageFilesToExist } from "@/test/responsiveImageTestUtils";

describe("branding assets", () => {
  it("provides responsive USYD header logo metadata", () => {
    expect(BRANDING_ASSETS.headerUsyd).toEqual({
      src: "/branding/logo-usyd-black-320.webp",
      srcSet:
        "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w",
      sizes: "6.3209rem",
      renderedHeight: "2.1875rem",
    });
  });

  it("provides 3x footer candidates and rem-based source sizes", () => {
    expect(BRANDING_ASSETS.footerUsyd).toEqual({
      src: "/branding/logo-usyd-black-471.webp",
      srcSet:
        "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w, /branding/logo-usyd-black-471.webp 471w",
      sizes: "9.0299rem",
      renderedHeight: "3.125rem",
    });
    expect(BRANDING_ASSETS.footerSma).toEqual({
      src: "/branding/sma-black-480.webp",
      srcSet:
        "/branding/sma-black-160.webp 160w, /branding/sma-black-320.webp 320w, /branding/sma-black-480.webp 480w",
      sizes: "7.7917rem",
      renderedHeight: "3.125rem",
    });
  });

  it("points every branding candidate at an existing public asset", () => {
    for (const [assetName, image] of Object.entries(BRANDING_ASSETS)) {
      expect(
        image,
        `${assetName} should have valid responsive image metadata`,
      ).not.toBeNull();

      if (image === null) {
        continue;
      }

      expectResponsiveImageFilesToExist(image, assetName);
    }
  });
});
