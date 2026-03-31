import { describe, expect, it } from "vitest";
import { buildHeatRiskRequest, isHeatRiskApiResponse } from "@/api/heatRisk";

describe("buildHeatRiskRequest", () => {
  it("adds the default ADULT profile to the Home risk payload", () => {
    expect(
      buildHeatRiskRequest({
        sport: "SOCCER",
        latitude: -33.847,
        longitude: 151.067,
      }),
    ).toEqual({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });
  });
});

describe("isHeatRiskApiResponse", () => {
  it("accepts the forecast-centric backend contract", () => {
    expect(
      isHeatRiskApiResponse({
        request: {
          sport: "SOCCER",
          profile: "ADULT",
          location: {
            latitude: -33.847,
            longitude: 151.067,
            timezone: "Australia/Sydney",
          },
        },
        forecast: [
          {
            time_utc: "2026-03-09T00:00:00Z",
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37.25,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
              wind_speed_effective_ms: 1.02,
              direct_normal_irradiance_wm2: 700,
            },
            heat_risk: {
              risk_level_interpolated: 1.94,
              t_medium: 34.5,
              t_high: 37.1,
              t_extreme: 39.2,
              recommendation: "Increase hydration & modify clothing",
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects responses that still expose top-level location", () => {
    expect(
      isHeatRiskApiResponse({
        request: {
          sport: "SOCCER",
          profile: "ADULT",
        },
        location: {
          latitude: -33.847,
          longitude: 151.067,
          timezone: "Australia/Sydney",
        },
        forecast: [
          {
            time_utc: "2026-03-09T00:00:00Z",
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37.25,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
              wind_speed_effective_ms: 1.02,
              direct_normal_irradiance_wm2: 700,
            },
            heat_risk: {
              risk_level_interpolated: 1.94,
              t_medium: 34.5,
              t_high: 37.1,
              t_extreme: 39.2,
              recommendation: "Increase hydration & modify clothing",
            },
          },
        ],
      }),
    ).toBe(false);
  });
});
