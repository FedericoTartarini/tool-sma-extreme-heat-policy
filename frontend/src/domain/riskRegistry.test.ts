import { describe, expect, it } from "vitest";
import {
  getRiskBadgeForegroundColor,
  getRiskBands,
  toRiskDisplayScore,
  toRiskLevel,
} from "@/domain/riskRegistry";

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
  it("anchors the maximum model score to the high/extreme boundary", () => {
    expect(toRiskDisplayScore(0.8)).toBe(0);
    expect(toRiskDisplayScore(1.5)).toBe(0.5);
    expect(toRiskDisplayScore(3.5)).toBe(2.5);
    expect(toRiskDisplayScore(4)).toBe(3);
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
