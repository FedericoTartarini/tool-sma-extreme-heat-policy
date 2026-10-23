import { describe, expect, it } from "vitest";
import {
  RECOMMENDATION_QUERY_PARSERS,
  getDetailedRecommendationsPath,
} from "@/lib/recommendationRouteState";

describe("getDetailedRecommendationsPath", () => {
  it("passes the selected risk level as a query parameter", () => {
    expect(getDetailedRecommendationsPath("moderate")).toBe(
      "/detailed-recommendations?level=moderate",
    );
  });
});

describe("RECOMMENDATION_QUERY_PARSERS.level", () => {
  const { level } = RECOMMENDATION_QUERY_PARSERS;

  it("maps valid query levels to the accordion item to open", () => {
    expect(level.parse("low")).toBe("low");
    expect(level.parse("moderate")).toBe("moderate");
    expect(level.parse("high")).toBe("high");
    expect(level.parse("extreme")).toBe("extreme");
  });

  it("ignores missing or unknown query levels", () => {
    expect(level.parse("")).toBeNull();
    expect(level.parse("medium")).toBeNull();
  });
});
