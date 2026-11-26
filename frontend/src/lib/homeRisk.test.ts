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
          },
          {
            time_utc: "2026-03-09T02:00:00Z",
            time_local: "2026-03-09T13:00:00+11:00",
            inputs: {
              tdb: 32,
              tr: 38,
              rh: 61,
              v_z1: 1.6,
              sol_radiation_dir: 740,
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
        daily_weather: [],
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
          tdb: 30,
          tr: 35,
          rh: 60,
          v_z1: 1.2,
          sol_radiation_dir: 650,
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
          tdb: 31,
          tr: 36,
          rh: 59,
          v_z1: 1.3,
          sol_radiation_dir: 670,
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
          tdb: 32,
          tr: 37,
          rh: 58,
          v_z1: 1.4,
          sol_radiation_dir: 690,
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
        weatherDetails: null,
      },
    ]);
  });

  it("maps daily weather summaries into grouped day details", () => {
    const forecastDays = toForecastDays(
      [
        {
          time_utc: "2026-03-09T15:15:00Z",
          time_local: "2026-03-10T00:00:00+08:45",
          inputs: {
            tdb: 30,
            tr: 35,
            rh: 60,
            v_z1: 1.2,
            sol_radiation_dir: 650,
          },
          heat_risk: {
            risk_level_interpolated: 1.8,
            t_medium: 34.5,
            t_high: 37.1,
            t_extreme: 39.2,
            recommendation: "Hydrate",
          },
        },
      ],
      [
        {
          date: "2026-03-10",
          sunrise_local: "06:12",
          sunset_local: "18:48",
          uv_index_max: 9.1,
          precip_prob_max_pct: 55,
          cumulative_rainfall_mm: 3.2,
          max_temp_c: 30,
          min_temp_c: 10,
          max_temp_time_local: "13:00",
          min_temp_time_local: "10:00",
          humidity_at_max_pct: 22,
          humidity_at_min_pct: 49,
          uv_index_max_time_local: "13:00",
          avg_wind_speed_ms: 2.8,
        },
      ],
    );

    expect(forecastDays[0]?.weatherDetails).toEqual({
      maxTempC: 30,
      minTempC: 10,
      humidityAtMaxPct: 22,
      humidityAtMinPct: 49,
      avgWindSpeedMs: 2.8,
      maxTempTimeLocal: "13:00",
      minTempTimeLocal: "10:00",
      uvIndexMax: 9.1,
      uvIndexMaxTimeLocal: "13:00",
      precipProbMaxPct: 55,
      cumulativeRainfallMm: 3.2,
      sunriseLocal: "06:12",
      sunsetLocal: "18:48",
    });
  });

  it("returns null weather details when daily summaries do not match the day", () => {
    const forecastDays = toForecastDays(
      [
        {
          time_utc: "2026-03-09T15:15:00Z",
          time_local: "2026-03-10T00:00:00+08:45",
          inputs: {
            tdb: 30,
            tr: 35,
            rh: 60,
            v_z1: 1.2,
            sol_radiation_dir: 650,
          },
          heat_risk: {
            risk_level_interpolated: 1.8,
            t_medium: 34.5,
            t_high: 37.1,
            t_extreme: 39.2,
            recommendation: "Hydrate",
          },
        },
      ],
      [
        {
          date: "2026-03-09",
          sunrise_local: "06:12",
          sunset_local: "18:48",
          uv_index_max: 9.1,
          precip_prob_max_pct: 55,
          cumulative_rainfall_mm: 3.2,
        },
      ],
    );

    expect(forecastDays[0]?.weatherDetails).toBeNull();
  });

  it("throws when a forecast point contains an invalid time_local value", () => {
    expect(() =>
      toForecastDays([
        {
          time_utc: "2026-03-09T00:00:00Z",
          time_local: "not-a-local-time",
          inputs: {
            tdb: 30,
            tr: 35,
            rh: 60,
            v_z1: 1.2,
            sol_radiation_dir: 650,
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
