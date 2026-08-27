import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchHeatRiskBatch,
  isBatchHeatRiskApiResponse,
} from "@/api/heatRiskBatch";

const VALID_BATCH_RESPONSE = {
  request: {
    sport: "SOCCER",
    profile: "ADULT",
  },
  locations: [
    {
      latitude: -33.847,
      longitude: 151.067,
      timezone: "Australia/Sydney",
      status: "ok",
      current_risk_level_interpolated: 1.94,
      today_max_risk_level_interpolated: 2.14,
      current_time_local: "2026-03-09T11:00:00+11:00",
      error_code: null,
      detail: null,
    },
    {
      latitude: -37.813,
      longitude: 144.963,
      timezone: "Australia/Melbourne",
      status: "error",
      current_risk_level_interpolated: null,
      today_max_risk_level_interpolated: null,
      current_time_local: null,
      error_code: "weather_provider_unavailable",
      detail: "Weather provider unavailable",
    },
  ],
};

describe("fetchHeatRiskBatch", () => {
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

  it("posts the batch payload to the batch endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(VALID_BATCH_RESPONSE), { status: 200 }),
    );

    const result = await fetchHeatRiskBatch({
      sport: "SOCCER",
      profile: "ADULT",
      locations: [
        { latitude: -33.847, longitude: 151.067 },
        { latitude: -37.813, longitude: 144.963 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/home/risk/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sport: "SOCCER",
          profile: "ADULT",
          locations: [
            { latitude: -33.847, longitude: 151.067 },
            { latitude: -37.813, longitude: 144.963 },
          ],
        }),
      }),
    );
  });

  it("validates the batch response contract", () => {
    expect(isBatchHeatRiskApiResponse(VALID_BATCH_RESPONSE)).toBe(true);
    expect(isBatchHeatRiskApiResponse({ request: {}, locations: [] })).toBe(
      false,
    );
  });
});
