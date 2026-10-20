import { describe, expect, it } from "vitest";
import type { ForecastApiPoint } from "@/api/heatRisk";
import {
  deriveDashboardRiskLevels,
  getCurrentRiskFromForecast,
  getTodayMaxRiskFromForecast,
  toDashboardForecastSnapshot,
} from "@/domain/dashboardForecast";

const BASE_POINT: Omit<ForecastApiPoint, "time_utc" | "time_local"> = {
  inputs: {
    tdb: 31,
    tr: 37,
    rh: 62,
    v_z1: 1.5,
    sol_radiation_dir: 700,
  },
  heat_risk: {
    risk_level_interpolated: 1.2,
    t_medium: 34.5,
    t_high: 37.1,
    t_extreme: 39.2,
    recommendation: "Hydrate",
  },
};

const FORECAST: ForecastApiPoint[] = [
  {
    time_utc: "2026-03-09T01:00:00Z",
    time_local: "2026-03-09T12:00:00+11:00",
    ...BASE_POINT,
  },
  {
    time_utc: "2026-03-09T02:00:00Z",
    time_local: "2026-03-09T13:00:00+11:00",
    ...BASE_POINT,
    heat_risk: {
      ...BASE_POINT.heat_risk,
      risk_level_interpolated: 2.4,
    },
  },
  {
    time_utc: "2026-03-10T01:00:00Z",
    time_local: "2026-03-10T12:00:00+11:00",
    ...BASE_POINT,
    heat_risk: {
      ...BASE_POINT.heat_risk,
      risk_level_interpolated: 3.1,
    },
  },
];

describe("dashboardForecast", () => {
  it("derives current risk from the earliest forecast point", () => {
    expect(getCurrentRiskFromForecast(FORECAST)).toBe(1.2);
  });

  it("derives today max from the first local forecast day only", () => {
    expect(getTodayMaxRiskFromForecast(FORECAST)).toBe(2.4);
  });

  it("returns null when forecast is empty", () => {
    expect(deriveDashboardRiskLevels([])).toBeNull();
  });

  it("combines current and today max risk levels", () => {
    expect(deriveDashboardRiskLevels(FORECAST)).toEqual({
      currentRiskLevelInterpolated: 1.2,
      todayMaxRiskLevelInterpolated: 2.4,
    });
  });

  it("builds a dashboard forecast snapshot from a heat-risk response", () => {
    expect(
      toDashboardForecastSnapshot({
        request: {
          sport: "SOCCER",
          profile: "ADULT",
          location: {
            latitude: -33.86,
            longitude: 151.21,
            timezone: "Australia/Sydney",
          },
        },
        forecast: FORECAST,
      }),
    ).toEqual({
      sport: "SOCCER",
      latitude: -33.86,
      longitude: 151.21,
      timezone: "Australia/Sydney",
      forecast: FORECAST,
    });
  });
});
