import { describe, expect, it } from "vitest";
import {
  getDetailedRecommendationsPath,
  parseRecommendationLevelParam,
} from "@/lib/recommendationRouteState";

describe("getDetailedRecommendationsPath", () => {
  it("passes the selected risk level as a query parameter", () => {
    expect(getDetailedRecommendationsPath("moderate")).toBe(
      "/detailed-recommendations?level=moderate",
    );
  });
});

describe("parseRecommendationLevelParam", () => {
  it("maps valid query levels to the accordion item to open", () => {
    expect(parseRecommendationLevelParam("low")).toBe("low");
    expect(parseRecommendationLevelParam("moderate")).toBe("moderate");
    expect(parseRecommendationLevelParam("high")).toBe("high");
    expect(parseRecommendationLevelParam("extreme")).toBe("extreme");
  });

  it("ignores missing or unknown query levels", () => {
    expect(parseRecommendationLevelParam(null)).toBeUndefined();
    expect(parseRecommendationLevelParam("")).toBeUndefined();
    expect(parseRecommendationLevelParam("medium")).toBeUndefined();
  });
});
