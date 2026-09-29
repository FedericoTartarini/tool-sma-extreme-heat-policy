import { describe, expect, it } from "vitest";
import {
  isSportType,
  sports,
  SportType,
  SPORT_TYPE_VALUES,
} from "@/domain/sport";
import enTranslation from "@/i18n/locales/en/translation.json";
import { expectResponsiveImageFilesToExist } from "@/test/responsiveImageTestUtils";

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
        sizes: "(max-width: 720px) calc(100vw - 3rem), calc(720px - 3rem)",
      },
    });
  });

  it("uses the available 522px width for Soccer and Walking images", () => {
    expect(
      sports.find((sport) => sport.type === SportType.Soccer)?.image,
    ).toEqual({
      src: "/sports/soccer-522.webp",
      srcSet: "/sports/soccer-320.webp 320w, /sports/soccer-522.webp 522w",
      sizes: "(max-width: 720px) calc(100vw - 3rem), calc(720px - 3rem)",
    });
    expect(
      sports.find((sport) => sport.type === SportType.Walking)?.image,
    ).toEqual({
      src: "/sports/walking-522.webp",
      srcSet: "/sports/walking-320.webp 320w, /sports/walking-522.webp 522w",
      sizes: "(max-width: 720px) calc(100vw - 3rem), calc(720px - 3rem)",
    });
  });

  it("points every sport image candidate at an existing public asset", () => {
    for (const sport of sports) {
      expect(
        sport.image,
        `${sport.type} should have valid responsive image metadata`,
      ).not.toBeNull();

      if (sport.image === null) {
        continue;
      }

      expectResponsiveImageFilesToExist(sport.image, sport.type);
    }
  });
});
