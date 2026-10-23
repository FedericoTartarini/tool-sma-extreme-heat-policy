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
        config: { widths: [48, 96], sizes: "2.5rem" },
      }),
    ).toEqual({
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
      sizes: "2.5rem",
    });
  });

  it("sorts widths and removes duplicates", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/cooling",
        config: { widths: [96, 48, 96, 48], sizes: "2.5rem" },
      })?.srcSet,
    ).toBe("/actions/cooling-48.webp 48w, /actions/cooling-96.webp 96w");
  });

  it("uses the largest width as the fallback source", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "sports/running",
        config: { widths: [320, 816, 640], sizes: "45rem" },
      })?.src,
    ).toBe("/sports/running-816.webp");
  });

  it("uses Vite BASE_URL and normalizes a leading path slash", () => {
    vi.stubEnv("BASE_URL", "/heat-policy/");

    expect(
      createResponsiveImageAsset({
        assetPath: "/actions/pause",
        config: { widths: [48, 96], sizes: "2.5rem" },
      }),
    ).toEqual({
      src: "/heat-policy/actions/pause-96.webp",
      srcSet:
        "/heat-policy/actions/pause-48.webp 48w, /heat-policy/actions/pause-96.webp 96w",
      sizes: "2.5rem",
    });
  });

  it("trims surrounding whitespace from the asset path", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "  actions/clothing  ",
        config: { widths: [48, 96], sizes: "2.5rem" },
      }),
    ).toEqual({
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
      sizes: "2.5rem",
    });
  });

  it.each(["", "   ", "actions/stop.png", "actions/stop.webp"])(
    "returns null for invalid asset path %j",
    (assetPath) => {
      expect(
        createResponsiveImageAsset({
          assetPath,
          config: { widths: [48, 96], sizes: "2.5rem" },
        }),
      ).toBeNull();
    },
  );

  it("returns null for an empty widths list", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/stop",
        config: { widths: [], sizes: "2.5rem" },
      }),
    ).toBeNull();
  });

  it("filters invalid widths before sorting and removing duplicates", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/stop",
        config: {
          widths: [96, 0, -1, 48.5, Number.NaN, 48, 96],
          sizes: "2.5rem",
        },
      }),
    ).toEqual({
      src: "/actions/stop-96.webp",
      srcSet: "/actions/stop-48.webp 48w, /actions/stop-96.webp 96w",
      sizes: "2.5rem",
    });
  });

  it("returns null when every width is invalid", () => {
    expect(
      createResponsiveImageAsset({
        assetPath: "actions/stop",
        config: {
          widths: [0, -1, 48.5, Number.NaN, Number.POSITIVE_INFINITY],
          sizes: "2.5rem",
        },
      }),
    ).toBeNull();
  });
});
