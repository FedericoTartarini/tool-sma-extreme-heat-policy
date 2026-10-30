import type { HeatRiskApiResponse } from "@/api/heatRisk";
import type { SavedDashboardCard } from "@/domain/dashboard";
import type { DashboardForecastSnapshot } from "@/domain/dashboardForecast";

export const sydneyCard: SavedDashboardCard = {
  id: "sydney",
  sport: "SOCCER",
  name: "Sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  countryName: "Australia",
  latitude: -33.86,
  longitude: 151.21,
};

function buildSydneyForecastPoints() {
  return Array.from({ length: 25 }, (_, hour) => {
    const utc = Date.UTC(2026, 8, 14, 14 + hour);
    return {
      time_utc: new Date(utc).toISOString(),
      time_local: `${new Date(utc + 10 * 3_600_000).toISOString().slice(0, 19)}+10:00`,
      inputs: {
        tdb: 25,
        tr: 30,
        rh: 50,
        v_z1: 2,
        sol_radiation_dir: 200,
      },
      heat_risk: {
        risk_level_interpolated: hour === 19 ? 3.2 : 1.2,
        t_medium: 30,
        t_high: 35,
        t_extreme: 40,
        recommendation: "",
      },
    };
  });
}

export function sydneyForecast(): DashboardForecastSnapshot {
  return {
    sport: sydneyCard.sport,
    latitude: sydneyCard.latitude,
    longitude: sydneyCard.longitude,
    timezone: "Australia/Sydney",
    forecast: buildSydneyForecastPoints(),
  };
}

/**
 * Drops forecast samples the way the backend does
 * (`clients/open_meteo.py`: keep `time_utc >= now - 1h`).
 */
export function trimForecastLikeBackend(
  response: HeatRiskApiResponse,
  now: Date,
): HeatRiskApiResponse {
  const threshold = now.getTime() - 3_600_000;

  return {
    ...response,
    forecast: response.forecast.filter(
      (point) => Date.parse(point.time_utc) >= threshold,
    ),
  };
}

export function sydneyHeatRiskResponse(): HeatRiskApiResponse {
  const forecast = buildSydneyForecastPoints();

  return {
    request: {
      sport: sydneyCard.sport,
      profile: "ADULT",
      location: {
        latitude: sydneyCard.latitude,
        longitude: sydneyCard.longitude,
        timezone: "Australia/Sydney",
      },
    },
    forecast,
  };
}
