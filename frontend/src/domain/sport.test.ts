import { describe, expect, it } from "vitest";
import {
  isSportType,
  sports,
  SportType,
  SPORT_TYPE_VALUES,
} from "@/domain/sport";
import enTranslation from "@/i18n/locales/en/translation.json";

describe("sport registry", () => {
  it("registers Croquet for selection, persistence, and API requests", () => {
    expect(SportType.Croquet).toBe("CROQUET");
    expect(SPORT_TYPE_VALUES).toContain("CROQUET");
    expect(isSportType("CROQUET")).toBe(true);
  });

  it("exposes Croquet translation and responsive image metadata", () => {
    expect(enTranslation.sports.croquet).toBe("Croquet");
    expect(
      sports.find((sport) => sport.type === SportType.Croquet),
    ).toMatchObject({
      type: "CROQUET",
      assetName: "croquet",
      labelKey: "sports.croquet",
      image: {
        src: "/sports/croquet-816.webp",
        srcSet:
          "/sports/croquet-320.webp 320w, /sports/croquet-640.webp 640w, /sports/croquet-816.webp 816w",
      },
    });
  });

  it("uses the available 522px width for Soccer and Walking images", () => {
    expect(
      sports.find((sport) => sport.type === SportType.Soccer)?.image,
    ).toEqual({
      src: "/sports/soccer-522.webp",
      srcSet: "/sports/soccer-320.webp 320w, /sports/soccer-522.webp 522w",
    });
    expect(
      sports.find((sport) => sport.type === SportType.Walking)?.image,
    ).toEqual({
      src: "/sports/walking-522.webp",
      srcSet: "/sports/walking-320.webp 320w, /sports/walking-522.webp 522w",
    });
  });
});
