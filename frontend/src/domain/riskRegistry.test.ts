import { describe, expect, it } from "vitest";
import {
  getRiskBadgeForegroundColor,
  getRiskBands,
  RISK_LEVELS,
  RISK_REGISTRY,
  type RiskLevel,
  toRiskDisplayScore,
  toRiskLevel,
} from "@/domain/riskRegistry";
import { RISK_LEVEL_META } from "@/domain/riskMeta";

const EXPECTED_KEY_ICON_ASSETS = {
  low: [
    {
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
    },
    {
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
    },
  ],
  moderate: [
    {
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
    },
    {
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
    },
    {
      src: "/actions/pause-96.webp",
      srcSet: "/actions/pause-48.webp 48w, /actions/pause-96.webp 96w",
    },
  ],
  high: [
    {
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
    },
    {
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
    },
    {
      src: "/actions/pause-96.webp",
      srcSet: "/actions/pause-48.webp 48w, /actions/pause-96.webp 96w",
    },
    {
      src: "/actions/cooling-96.webp",
      srcSet: "/actions/cooling-48.webp 48w, /actions/cooling-96.webp 96w",
    },
  ],
  extreme: [
    {
      src: "/actions/stop-96.webp",
      srcSet: "/actions/stop-48.webp 48w, /actions/stop-96.webp 96w",
    },
  ],
} satisfies Record<RiskLevel, { src: string; srcSet: string }[]>;

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
  it("keeps responsive action assets in the configured order", () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_REGISTRY[level].keyIconAssets).toEqual(
        EXPECTED_KEY_ICON_ASSETS[level],
      );
    }
  });

  it("exposes responsive action assets through the legacy risk metadata", () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_LEVEL_META[level].keyIconAssets).toEqual(
        EXPECTED_KEY_ICON_ASSETS[level],
      );
    }
  });
});
