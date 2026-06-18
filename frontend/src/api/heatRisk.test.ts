import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHeatRisk, isHeatRiskApiResponse } from "@/api/heatRisk";

const VALID_HEAT_RISK_RESPONSE = {
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
      time_local: "2026-03-09T11:00:00+11:00",
      inputs: {
        air_temperature_c: 31,
        mean_radiant_temperature_c: 37.25,
        relative_humidity_pct: 62,
        wind_speed_10m_ms: 1.5,
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
};

describe("fetchHeatRisk", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the frozen ADULT profile in the Home risk payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(VALID_HEAT_RISK_RESPONSE), { status: 200 }),
    );

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/home/risk",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sport: "SOCCER",
          latitude: -33.847,
          longitude: 151.067,
          profile: "ADULT",
        }),
      }),
    );
  });

  it("returns missing_config without calling fetch when the API base URL is absent", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "missing_config",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("classifies backend HTTP errors with the response status", async () => {
    fetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "http_status",
      status: 502,
    });
  });

  it("classifies weather provider backend error codes", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "Weather provider unavailable",
          error_code: "weather_provider_unavailable",
        }),
        { status: 502 },
      ),
    );

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "weather_provider_unavailable",
      status: 502,
    });
  });

  it("classifies invalid backend response shapes", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ forecast: [] }), { status: 200 }),
    );

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_response",
    });
  });

  it("classifies network failures", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("classifies aborted requests separately from network failures", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result).toEqual({
      ok: false,
      reason: "abort",
    });
  });
});

describe("isHeatRiskApiResponse", () => {
  it("accepts the forecast-centric backend contract", () => {
    expect(
      isHeatRiskApiResponse({
        request: {
          sport: "SOCCER",
          profile: "AGE_10_13",
          location: {
            latitude: -33.847,
            longitude: 151.067,
            timezone: "Australia/Sydney",
          },
        },
        forecast: [
          {
            time_utc: "2026-03-09T00:00:00Z",
            time_local: "2026-03-09T11:00:00+11:00",
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37.25,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
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
            time_local: "2026-03-09T11:00:00+11:00",
            inputs: {
              air_temperature_c: 31,
              mean_radiant_temperature_c: 37.25,
              relative_humidity_pct: 62,
              wind_speed_10m_ms: 1.5,
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

  it("rejects forecast points without time_local", () => {
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
