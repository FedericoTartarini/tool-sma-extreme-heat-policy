import { describe, expect, it } from "vitest";
import {
  getRiskStackedBarAnchorStyle,
  RISK_STACKED_BAR_TRACK_INSET,
} from "@/config/uiScale";

describe("getRiskStackedBarAnchorStyle", () => {
  it("positions at the inset track start at 0%", () => {
    expect(getRiskStackedBarAnchorStyle(0)).toEqual({
      left: RISK_STACKED_BAR_TRACK_INSET,
      transform: "none",
    });
  });

  it("positions at the inset track center at 50%", () => {
    expect(getRiskStackedBarAnchorStyle(50)).toEqual({
      left: `calc(${RISK_STACKED_BAR_TRACK_INSET} + (100% - calc(2 * ${RISK_STACKED_BAR_TRACK_INSET})) * 0.5)`,
      transform: "translateX(-50%)",
    });
  });

  it("positions at the inset track end at 100%", () => {
    expect(getRiskStackedBarAnchorStyle(100)).toEqual({
      left: `calc(100% - ${RISK_STACKED_BAR_TRACK_INSET})`,
      transform: "translateX(-100%)",
    });
  });
});
