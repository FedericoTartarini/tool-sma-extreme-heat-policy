import { describe, expect, it } from "vitest";
import { BRANDING_ASSETS } from "@/domain/brandingAssets";

describe("branding assets", () => {
  it("provides responsive USYD logo sources", () => {
    expect(BRANDING_ASSETS.usyd).toEqual({
      src: "/branding/logo-usyd-black-320.webp",
      srcSet:
        "/branding/logo-usyd-black-160.webp 160w, /branding/logo-usyd-black-320.webp 320w",
    });
  });

  it("provides responsive SMA logo sources", () => {
    expect(BRANDING_ASSETS.sma).toEqual({
      src: "/branding/sma-black-320.webp",
      srcSet:
        "/branding/sma-black-160.webp 160w, /branding/sma-black-320.webp 320w",
    });
  });
});
