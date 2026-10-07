import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HeatRiskApiResponse } from "@/api/heatRisk";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";

const { LATITUDE, LONGITUDE } = vi.hoisted(() => ({
  LATITUDE: -33.847,
  LONGITUDE: 151.067,
}));

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (
    selector: (state: {
      profile: string;
      sport: string;
      selectedLocation: { latitude: number; longitude: number };
    }) => unknown,
  ) =>
    selector({
      profile: "ADULT",
      sport: "SOCCER",
      selectedLocation: { latitude: LATITUDE, longitude: LONGITUDE },
    }),
}));

const API_RESPONSE: HeatRiskApiResponse = {
  request: {
    sport: "SOCCER",
    profile: "ADULT",
    location: {
      latitude: LATITUDE,
      longitude: LONGITUDE,
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
    {
      time_utc: "2026-03-09T13:00:00Z",
      time_local: "2026-03-10T00:00:00+11:00",
      inputs: {
        tdb: 27,
        tr: 33,
        rh: 58,
        v_z1: 1.2,
        sol_radiation_dir: 120,
      },
      heat_risk: {
        risk_level_interpolated: 1.1,
        t_medium: 34.5,
        t_high: 37.1,
        t_extreme: 39.2,
        recommendation: "Increase hydration & modify clothing",
      },
    },
  ],
  daily_weather: [
    {
      date: "2026-03-09",
      sunrise_local: "06:30",
      sunset_local: "19:45",
      uv_index_max: 8.2,
      precip_prob_max_pct: 55,
      cumulative_rainfall_mm: 3.2,
      max_temp_c: 31,
      min_temp_c: 18,
      max_temp_time_local: "14:00",
      min_temp_time_local: "08:00",
      humidity_at_max_pct: 22,
      humidity_at_min_pct: 49,
      uv_index_max_time_local: "13:00",
      avg_wind_speed_ms: 2.8,
    },
    {
      date: "2026-03-10",
      max_temp_c: 27.5,
      min_temp_c: 16,
    },
  ],
};

type HeatRiskHookResult = ReturnType<typeof useHomeHeatRisk>;

function HeatRiskProbe({
  onResult,
}: {
  onResult: (result: HeatRiskHookResult) => void;
}) {
  onResult(useHomeHeatRisk());
  return null;
}

function renderHeatRiskHook(): HeatRiskHookResult | null {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["heatRisk", "SOCCER", "ADULT", LATITUDE.toFixed(6), LONGITUDE.toFixed(6)],
    { ok: true, data: API_RESPONSE },
  );

  let result = null as HeatRiskHookResult | null;

  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <HeatRiskProbe
        onResult={(hookResult) => {
          result = hookResult;
        }}
      />
    </QueryClientProvider>,
  );

  return result;
}

describe("useHomeHeatRisk", () => {
  it("maps daily_weather onto forecast days for the weather details panel", () => {
    const result = renderHeatRiskHook();

    expect(result?.hasCalculatedRisk).toBe(true);
    expect(result?.forecast).toHaveLength(2);
    expect(result?.forecast[0]?.weatherDetails).toEqual({
      maxTempC: 31,
      minTempC: 18,
      humidityAtMaxPct: 22,
      humidityAtMinPct: 49,
      avgWindSpeedMs: 2.8,
      maxTempTimeLocal: "14:00",
      minTempTimeLocal: "08:00",
      uvIndexMax: 8.2,
      uvIndexMaxTimeLocal: "13:00",
      precipProbMaxPct: 55,
      cumulativeRainfallMm: 3.2,
      sunriseLocal: "06:30",
      sunsetLocal: "19:45",
    });
    expect(result?.forecast[1]?.weatherDetails).toEqual({
      maxTempC: 27.5,
      minTempC: 16,
      humidityAtMaxPct: null,
      humidityAtMinPct: null,
      avgWindSpeedMs: null,
      maxTempTimeLocal: null,
      minTempTimeLocal: null,
      uvIndexMax: null,
      uvIndexMaxTimeLocal: null,
      precipProbMaxPct: null,
      cumulativeRainfallMm: null,
      sunriseLocal: null,
      sunsetLocal: null,
    });
  });
});
