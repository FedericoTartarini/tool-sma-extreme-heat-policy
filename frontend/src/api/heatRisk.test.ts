import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHeatRisk } from "@/api/heatRisk";

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
        tdb: 31,
        tr: 37.25,
        rh: 62,
        v_z1: 1.5,
        sol_radiation_dir: 525,
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
    vi.restoreAllMocks();
  });

  it("sends Croquet with the frozen ADULT profile in the Home risk payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...VALID_HEAT_RISK_RESPONSE,
          request: {
            ...VALID_HEAT_RISK_RESPONSE.request,
            sport: "CROQUET",
          },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchHeatRisk({
      sport: "CROQUET",
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
          sport: "CROQUET",
          latitude: -33.847,
          longitude: 151.067,
          profile: "ADULT",
        }),
      }),
    );
  });

  it("clears malformed daily weather fields one at a time and drops rows without a valid date", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...VALID_HEAT_RISK_RESPONSE,
          daily_weather: [
            {
              date: "2026-03-09",
              sunrise_local: "06:30",
              sunset_local: "19:45",
              uv_index_max: 8.2,
            },
            {
              date: "2026-03-10",
              sunrise_local: "",
              sunset_local: "19:45",
            },
            {
              date: "2026-3-10",
              sunrise_local: "06:30",
              sunset_local: "19:45",
            },
            {
              date: "2026-03-11",
              sunrise_local: null,
              sunset_local: null,
              max_temp_c: 27.5,
            },
            {
              date: "2026-03-12",
              max_temp_c: "hot",
              min_temp_c: 0,
              cumulative_rainfall_mm: 0,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchHeatRisk({
      sport: "SOCCER",
      latitude: -33.847,
      longitude: 151.067,
      profile: "ADULT",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.daily_weather).toEqual([
      {
        date: "2026-03-09",
        sunrise_local: "06:30",
        sunset_local: "19:45",
        uv_index_max: 8.2,
      },
      {
        date: "2026-03-10",
        sunrise_local: null,
        sunset_local: "19:45",
      },
      {
        date: "2026-03-11",
        sunrise_local: null,
        sunset_local: null,
        max_temp_c: 27.5,
      },
      {
        date: "2026-03-12",
        max_temp_c: null,
        min_temp_c: 0,
        cumulative_rainfall_mm: 0,
      },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring daily weather row without a valid date.",
      expect.objectContaining({ date: "2026-3-10" }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring malformed daily weather fields.",
      { date: "2026-03-10", fields: ["sunrise_local"] },
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Ignoring malformed daily weather fields.",
      { date: "2026-03-12", fields: ["max_temp_c"] },
    );
    expect(warnSpy).toHaveBeenCalledTimes(3);
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

  it("rejects responses that still expose top-level location", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          request: {
            sport: "SOCCER",
            profile: "ADULT",
          },
          location: {
            latitude: -33.847,
            longitude: 151.067,
            timezone: "Australia/Sydney",
          },
          forecast: VALID_HEAT_RISK_RESPONSE.forecast,
        }),
        { status: 200 },
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
      reason: "invalid_response",
    });
  });

  it("rejects forecast points without time_local", async () => {
    const [validPoint] = VALID_HEAT_RISK_RESPONSE.forecast;

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...VALID_HEAT_RISK_RESPONSE,
          forecast: [
            {
              time_utc: validPoint.time_utc,
              inputs: validPoint.inputs,
              heat_risk: validPoint.heat_risk,
            },
          ],
        }),
        { status: 200 },
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
