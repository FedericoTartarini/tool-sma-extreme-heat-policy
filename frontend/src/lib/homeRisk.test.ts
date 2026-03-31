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
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
              wind_speed_effective_ms: 1.02,
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
            inputs: {
              air_temperature_c: 32,
              mean_radiant_temperature_c: 38,
              relative_humidity_pct: 61,
              wind_speed_10m_ms: 1.6,
              wind_speed_effective_ms: 1.09,
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
  it("groups forecast points using the selected location timezone", () => {
    const forecastDays = toForecastDays(
      [
        {
          time_utc: "2026-03-09T15:00:00Z",
          inputs: {
            air_temperature_c: 30,
            mean_radiant_temperature_c: 35,
            relative_humidity_pct: 60,
            wind_speed_10m_ms: 1.2,
            wind_speed_effective_ms: 1.0,
            direct_normal_irradiance_wm2: 650,
          },
          heat_risk: {
            risk_level_interpolated: 0.8,
            t_medium: 34.5,
            t_high: 37.1,
            t_extreme: 39.2,
            recommendation: "Hydrate",
          },
        },
        {
          time_utc: "2026-03-09T16:00:00Z",
          inputs: {
            air_temperature_c: 31,
            mean_radiant_temperature_c: 36,
            relative_humidity_pct: 59,
            wind_speed_10m_ms: 1.3,
            wind_speed_effective_ms: 1.1,
            direct_normal_irradiance_wm2: 670,
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
          time_utc: "2026-03-09T17:00:00Z",
          inputs: {
            air_temperature_c: 32,
            mean_radiant_temperature_c: 37,
            relative_humidity_pct: 58,
            wind_speed_10m_ms: 1.4,
            wind_speed_effective_ms: 1.2,
            direct_normal_irradiance_wm2: 690,
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
      "Australia/Eucla",
    );

    expect(forecastDays).toEqual([
      {
        date: "2026-03-09T15:00:00Z",
        risk: "low",
        points: [{ time: "23:45", value: 0.8 }],
      },
      {
        date: "2026-03-09T16:00:00Z",
        risk: "moderate",
        points: [
          { time: "00:45", value: 1.2 },
          { time: "01:45", value: 1.4 },
        ],
      },
    ]);
  });

  it("falls back to the browser timezone when the location timezone is missing", () => {
    const forecastDays = toForecastDays([
      {
        time_utc: "2026-03-09T00:00:00Z",
        inputs: {
          air_temperature_c: 30,
          mean_radiant_temperature_c: 35,
          relative_humidity_pct: 60,
          wind_speed_10m_ms: 1.2,
          wind_speed_effective_ms: 1.0,
          direct_normal_irradiance_wm2: 650,
        },
        heat_risk: {
          risk_level_interpolated: 0.8,
          t_medium: 34.5,
          t_high: 37.1,
          t_extreme: 39.2,
          recommendation: "Hydrate",
        },
      },
    ]);

    expect(forecastDays).toHaveLength(1);
    expect(forecastDays[0]?.points[0]?.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
