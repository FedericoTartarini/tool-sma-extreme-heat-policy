import { describe, expect, it } from "vitest";
import {
  getCurrentForecastPoint,
  toForecastDays,
  toHeatRiskMeta,
} from "@/lib/homeRisk";

describe("toHeatRiskMeta", () => {
  it("extracts location coordinates and timezone from the response location", () => {
    expect(
      toHeatRiskMeta({
        latitude: -31.9523,
        longitude: 115.8613,
        timezone: "Australia/Perth",
      }),
    ).toEqual({
      latitude: -31.9523,
      longitude: 115.8613,
      timeZone: "Australia/Perth",
    });
  });
});

describe("getCurrentForecastPoint", () => {
  it("returns the backend-defined current point from the forecast array", () => {
    expect(
      getCurrentForecastPoint({
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
            time_utc: "2026-03-09T01:00:00Z",
            time_local: "2026-03-09T12:00:00+11:00",
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
              direct_normal_irradiance_wm2: 700,
            },
            heat_risk: {
              risk_level_interpolated: 1.2,
              t_medium: 34.5,
              t_high: 37.1,
              t_extreme: 39.2,
              recommendation: "Hydrate",
            },
          },
          {
            time_utc: "2026-03-09T02:00:00Z",
            time_local: "2026-03-09T13:00:00+11:00",
            inputs: {
              air_temperature_c: 32,
              mean_radiant_temperature_c: 38,
              relative_humidity_pct: 61,
              wind_speed_10m_ms: 1.6,
              direct_normal_irradiance_wm2: 740,
            },
            heat_risk: {
              risk_level_interpolated: 1.4,
              t_medium: 34.5,
              t_high: 37.1,
              t_extreme: 39.2,
              recommendation: "Hydrate",
            },
          },
        ],
      }),
    ).toMatchObject({
      time_utc: "2026-03-09T01:00:00Z",
      heat_risk: {
        risk_level_interpolated: 1.2,
      },
    });
  });
});

describe("toForecastDays", () => {
  it("groups forecast points using time_local instead of browser-local conversions", () => {
    const forecastDays = toForecastDays([
      {
        time_utc: "2026-03-09T15:15:00Z",
        time_local: "2026-03-10T00:00:00+08:45",
        inputs: {
          air_temperature_c: 30,
          mean_radiant_temperature_c: 35,
          relative_humidity_pct: 60,
          wind_speed_10m_ms: 1.2,
          direct_normal_irradiance_wm2: 650,
        },
        heat_risk: {
          risk_level_interpolated: 1.8,
          t_medium: 34.5,
          t_high: 37.1,
          t_extreme: 39.2,
          recommendation: "Hydrate",
        },
      },
      {
        time_utc: "2026-03-09T16:15:00Z",
        time_local: "2026-03-10T01:00:00+08:45",
        inputs: {
          air_temperature_c: 31,
          mean_radiant_temperature_c: 36,
          relative_humidity_pct: 59,
          wind_speed_10m_ms: 1.3,
          direct_normal_irradiance_wm2: 670,
        },
        heat_risk: {
          risk_level_interpolated: 2.2,
          t_medium: 34.5,
          t_high: 37.1,
          t_extreme: 39.2,
          recommendation: "Hydrate",
        },
      },
      {
        time_utc: "2026-03-09T17:15:00Z",
        time_local: "2026-03-10T02:00:00+08:45",
        inputs: {
          air_temperature_c: 32,
          mean_radiant_temperature_c: 37,
          relative_humidity_pct: 58,
          wind_speed_10m_ms: 1.4,
          direct_normal_irradiance_wm2: 690,
        },
        heat_risk: {
          risk_level_interpolated: 2.4,
          t_medium: 34.5,
          t_high: 37.1,
          t_extreme: 39.2,
          recommendation: "Hydrate",
        },
      },
    ]);

    expect(forecastDays).toEqual([
      {
        date: "2026-03-10T00:00:00+08:45",
        risk: "moderate",
        points: [
          { time: "00:00", value: 1.8 },
          { time: "01:00", value: 2.2 },
          { time: "02:00", value: 2.4 },
        ],
      },
    ]);
  });

  it("throws when a forecast point contains an invalid time_local value", () => {
    expect(() =>
      toForecastDays([
        {
          time_utc: "2026-03-09T00:00:00Z",
          time_local: "not-a-local-time",
          inputs: {
            air_temperature_c: 30,
            mean_radiant_temperature_c: 35,
            relative_humidity_pct: 60,
            wind_speed_10m_ms: 1.2,
            direct_normal_irradiance_wm2: 650,
          },
          heat_risk: {
            risk_level_interpolated: 1.8,
            t_medium: 34.5,
            t_high: 37.1,
            t_extreme: 39.2,
            recommendation: "Hydrate",
          },
        },
      ]),
    ).toThrow("invalid time_local");
  });
});
