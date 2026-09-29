import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPORT_IMAGE_CONFIG,
  getSportImageConfig,
  SPORT_IMAGE_CONFIG_BY_ASSET_NAME,
} from "@/config/responsiveImages";

describe("getSportImageConfig", () => {
  it.each(["soccer", "walking"] as const)(
    "returns the configured override for %s",
    (assetName) => {
      expect(getSportImageConfig(assetName)).toBe(
        SPORT_IMAGE_CONFIG_BY_ASSET_NAME[assetName],
      );
    },
  );

  it.each(["running", "unknown-sport", "constructor", "toString"])(
    "returns the default config for %s",
    (assetName) => {
      expect(getSportImageConfig(assetName)).toBe(DEFAULT_SPORT_IMAGE_CONFIG);
    },
  );
});
