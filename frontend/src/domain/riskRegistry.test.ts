import { describe, expect, it } from "vitest";
import { RECOMMENDATION_ACTION_ASSETS } from "@/domain/recommendationActionAssets";
import {
  getRiskBadgeForegroundColor,
  getRiskBands,
  RISK_LEVELS,
  RISK_REGISTRY,
  type RecommendationActionDefinition,
  type RiskLevel,
  toRiskDisplayScore,
  toRiskLevel,
} from "@/domain/riskRegistry";

const EXPECTED_KEY_ACTIONS = {
  low: [
    {
      id: "hydration",
      image: RECOMMENDATION_ACTION_ASSETS.hydration,
    },
    {
      id: "clothing",
      image: RECOMMENDATION_ACTION_ASSETS.clothing,
    },
  ],
  moderate: [
    {
      id: "hydration",
      image: RECOMMENDATION_ACTION_ASSETS.hydration,
    },
    {
      id: "clothing",
      image: RECOMMENDATION_ACTION_ASSETS.clothing,
    },
    {
      id: "rest",
      image: RECOMMENDATION_ACTION_ASSETS.pause,
    },
  ],
  high: [
    {
      id: "hydration",
      image: RECOMMENDATION_ACTION_ASSETS.hydration,
    },
    {
      id: "clothing",
      image: RECOMMENDATION_ACTION_ASSETS.clothing,
    },
    {
      id: "rest",
      image: RECOMMENDATION_ACTION_ASSETS.pause,
    },
    {
      id: "cooling",
      image: RECOMMENDATION_ACTION_ASSETS.cooling,
    },
  ],
  extreme: [
    {
      id: "suspend",
      image: RECOMMENDATION_ACTION_ASSETS.stop,
    },
  ],
} satisfies Record<RiskLevel, RecommendationActionDefinition[]>;

describe("toRiskLevel", () => {
  it("maps threshold boundaries into the expected risk levels", () => {
    expect(toRiskLevel(Number.NaN)).toBe("low");
    expect(toRiskLevel(1)).toBe("low");
    expect(toRiskLevel(2)).toBe("moderate");
    expect(toRiskLevel(3)).toBe("high");
    expect(toRiskLevel(4)).toBe("extreme");
  });
});

describe("getRiskBands", () => {
  it("returns the display bands in ascending threshold order", () => {
    expect(getRiskBands()).toEqual([
      { level: "low", lower: 0, upper: 1, color: "#FFE478" },
      { level: "moderate", lower: 1, upper: 2, color: "#F5810C" },
      { level: "high", lower: 2, upper: 3, color: "#CF3838" },
      { level: "extreme", lower: 3, upper: 4, color: "#8C2439" },
    ]);
  });
});

describe("toRiskDisplayScore", () => {
  it("maps raw model scores onto the shifted display axis", () => {
    expect(toRiskDisplayScore(0.8)).toBe(0);
    expect(toRiskDisplayScore(1.5)).toBe(0.5);
    expect(toRiskDisplayScore(3.5)).toBe(2.5);
    expect(toRiskDisplayScore(4)).toBe(3);
    expect(toRiskDisplayScore(4.9)).toBeCloseTo(3.9);
    expect(toRiskDisplayScore(5)).toBe(4);
    expect(toRiskDisplayScore(5.2)).toBe(4);
  });
});

describe("getRiskBadgeForegroundColor", () => {
  it("uses the highest-contrast text color for each risk badge", () => {
    expect(getRiskBadgeForegroundColor("low")).toBe("#000000");
    expect(getRiskBadgeForegroundColor("moderate")).toBe("#000000");
    expect(getRiskBadgeForegroundColor("high")).toBe("#ffffff");
    expect(getRiskBadgeForegroundColor("extreme")).toBe("#ffffff");
  });
});

describe("recommendation action assets", () => {
  it("keeps stable action ids and responsive assets in display order", () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_REGISTRY[level].keyActions).toEqual(
        EXPECTED_KEY_ACTIONS[level],
      );
      expect(RISK_REGISTRY[level].keyIconAssets).toEqual(
        EXPECTED_KEY_ACTIONS[level].map((action) => action.image),
      );
    }
  });
});
