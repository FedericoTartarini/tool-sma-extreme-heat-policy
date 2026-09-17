import { describe, expect, it } from "vitest";
import { RECOMMENDATION_ACTION_ASSETS } from "@/domain/recommendationActionAssets";

describe("RECOMMENDATION_ACTION_ASSETS", () => {
  it("provides responsive WebP assets for every recommendation action", () => {
    expect(RECOMMENDATION_ACTION_ASSETS).toEqual({
      hydration: {
        src: "/actions/hydration-96.webp",
        srcSet:
          "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
      },
      clothing: {
        src: "/actions/clothing-96.webp",
        srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
      },
      pause: {
        src: "/actions/pause-96.webp",
        srcSet: "/actions/pause-48.webp 48w, /actions/pause-96.webp 96w",
      },
      cooling: {
        src: "/actions/cooling-96.webp",
        srcSet: "/actions/cooling-48.webp 48w, /actions/cooling-96.webp 96w",
      },
      stop: {
        src: "/actions/stop-96.webp",
        srcSet: "/actions/stop-48.webp 48w, /actions/stop-96.webp 96w",
      },
    });
  });
});
