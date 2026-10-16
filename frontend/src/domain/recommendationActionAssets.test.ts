import { describe, expect, it } from "vitest";
import { RECOMMENDATION_ACTION_IMAGE_CONFIG } from "@/config/responsiveImages";
import { RECOMMENDATION_ACTION_ASSETS } from "@/domain/recommendationActionAssets";
import { expectResponsiveImageFilesToExist } from "@/test/responsiveImageTestUtils";

const ACTION_KEYS = [
  "hydration",
  "clothing",
  "pause",
  "cooling",
  "stop",
] as const;

describe("RECOMMENDATION_ACTION_ASSETS", () => {
  it.each(ACTION_KEYS)("provides responsive WebP metadata for %s", (key) => {
    expect(RECOMMENDATION_ACTION_ASSETS[key]).toEqual({
      src: `/actions/${key}-192.webp`,
      srcSet: `/actions/${key}-48.webp 48w, /actions/${key}-96.webp 96w, /actions/${key}-192.webp 192w`,
      sizes: RECOMMENDATION_ACTION_IMAGE_CONFIG.sizes,
    });
  });

  it("points every candidate at an existing width-matched public asset", () => {
    for (const [assetName, image] of Object.entries(
      RECOMMENDATION_ACTION_ASSETS,
    )) {
      expect(
        image,
        `${assetName} should have valid responsive image metadata`,
      ).not.toBeNull();

      if (image === null) {
        continue;
      }

      expectResponsiveImageFilesToExist(image, assetName);

      for (const candidate of image.srcSet.split(",")) {
        const candidateMatch = candidate.trim().match(/^(\S+)\s+(\d+)w$/);
        expect(
          candidateMatch,
          `${assetName} should use a URL and width descriptor: ${candidate}`,
        ).not.toBeNull();

        if (candidateMatch === null) {
          continue;
        }

        const [, candidateUrl, descriptorWidth] = candidateMatch;
        const suffixMatch = candidateUrl.match(/-(\d+)\.webp$/);
        expect(
          suffixMatch,
          `${assetName} candidate should end with a width suffix: ${candidateUrl}`,
        ).not.toBeNull();

        if (suffixMatch === null) {
          continue;
        }

        expect(Number(suffixMatch[1])).toBe(Number(descriptorWidth));
      }
    }
  });
});
