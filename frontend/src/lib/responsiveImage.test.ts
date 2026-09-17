import { afterEach, describe, expect, it, vi } from "vitest";
import { createResponsiveImageAsset } from "@/lib/responsiveImage";

describe("createResponsiveImageAsset", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds WebP candidate paths from an extensionless asset path", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/hydration",
        widths: [48, 96],
      }),
    ).toEqual({
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
    });
  });

  it("sorts widths and removes duplicates", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/cooling",
        widths: [96, 48, 96, 48],
      }).srcSet,
    ).toBe("/actions/cooling-48.webp 48w, /actions/cooling-96.webp 96w");
  });

  it("uses the largest width as the fallback source", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "sports/running",
        widths: [320, 816, 640],
      }).src,
    ).toBe("/sports/running-816.webp");
  });

  it("uses Vite BASE_URL and normalizes a leading path slash", () => {
    vi.stubEnv("BASE_URL", "/heat-policy/");

    expect(
      createResponsiveImageAsset({
        assetPath: "/actions/pause",
        widths: [48, 96],
      }),
    ).toEqual({
      src: "/heat-policy/actions/pause-96.webp",
      srcSet:
        "/heat-policy/actions/pause-48.webp 48w, /heat-policy/actions/pause-96.webp 96w",
    });
  });

  it("trims surrounding whitespace from the asset path", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "  actions/clothing  ",
        widths: [48, 96],
      }),
    ).toEqual({
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
    });
  });

  it.each(["", "   ", "actions/stop.png", "actions/stop.webp"])(
    "rejects invalid asset path %j",
    (assetPath) => {
      expect(() =>
        createResponsiveImageAsset({ assetPath, widths: [48, 96] }),
      ).toThrow(/assetPath/);
    },
  );

  it("rejects an empty widths list", () => {
    expect(() =>
      createResponsiveImageAsset({
        assetPath: "actions/stop",
        widths: [],
      }),
    ).toThrow(/widths/);
  });

  it.each([0, -1, 48.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid width %s",
    (width) => {
      expect(() =>
        createResponsiveImageAsset({
          assetPath: "actions/stop",
          widths: [48, width],
        }),
      ).toThrow(/widths/);
    },
  );
});
