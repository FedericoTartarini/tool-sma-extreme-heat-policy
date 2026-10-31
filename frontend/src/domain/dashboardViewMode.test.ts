import { describe, expect, it } from "vitest";
import {
  DASHBOARD_VIEW_MODES,
  isDashboardViewMode,
  parseDashboardViewMode,
} from "@/domain/dashboardViewMode";

describe("dashboardViewMode", () => {
  it.each(DASHBOARD_VIEW_MODES)(
    "accepts %s as a dashboard view mode",
    (mode) => {
      expect(isDashboardViewMode(mode)).toBe(true);
      expect(parseDashboardViewMode(mode)).toBe(mode);
    },
  );

  it("rejects unknown view mode values", () => {
    expect(isDashboardViewMode("invalid")).toBe(false);
    expect(parseDashboardViewMode("invalid")).toBeNull();
  });
});
