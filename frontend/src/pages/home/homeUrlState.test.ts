import { describe, expect, it } from "vitest";
import { SportType } from "@/domain/sport";
import {
  hasHomeSearchParams,
  parseHomeSearchParams,
} from "@/pages/home/homeUrlState";

describe("homeUrlState", () => {
  it("parses shared home navigation query params from the location search", () => {
    expect(
      parseHomeSearchParams(
        "?sport=SOCCER&loc=Sydney%2C+New+South+Wales%2C+Australia",
      ),
    ).toEqual({
      profile: null,
      sport: SportType.Soccer,
      location: "Sydney, New South Wales, Australia",
    });
  });

  it("detects when home filter params are present", () => {
    expect(hasHomeSearchParams("?sport=SOCCER")).toBe(true);
    expect(hasHomeSearchParams("")).toBe(false);
  });
});
