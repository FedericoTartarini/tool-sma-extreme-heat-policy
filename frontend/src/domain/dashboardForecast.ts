import type { ForecastApiPoint, HeatRiskApiResponse } from "@/api/heatRisk";
import type { SportType } from "@/domain/sport";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

export interface DashboardForecastSnapshot {
  sport: SportType;
  latitude: number;
  longitude: number;
  timezone: string;
  forecast: ForecastApiPoint[];
}

/**
 * Builds a dashboard forecast snapshot from a single `/home/risk` response.
 */
export function toDashboardForecastSnapshot(
  response: HeatRiskApiResponse,
): DashboardForecastSnapshot {
  return {
    sport: response.request.sport as SportType,
    latitude: response.request.location.latitude,
    longitude: response.request.location.longitude,
    timezone: response.request.location.timezone,
    forecast: response.forecast,
  };
}

export interface DashboardDerivedRiskLevels {
  currentRiskLevelInterpolated: number;
  todayMaxRiskLevelInterpolated: number;
}

/**
 * Returns the earliest forecast point's interpolated risk score.
 */
export function getCurrentRiskFromForecast(
  forecast: readonly ForecastApiPoint[],
): number | null {
  const [currentPoint] = forecast;

  if (!currentPoint) {
    return null;
  }

  return currentPoint.heat_risk.risk_level_interpolated;
}

/**
 * Returns the maximum interpolated risk score for the first local forecast day.
 */
export function getTodayMaxRiskFromForecast(
  forecast: readonly ForecastApiPoint[],
): number | null {
  if (forecast.length === 0) {
    return null;
  }

  const firstPointParts = parseOffsetIsoDateTime(forecast[0].time_local);

  if (!firstPointParts) {
    return null;
  }

  const todayDateKey = firstPointParts.dateKey;
  let todayMaxRisk = Number.NEGATIVE_INFINITY;

  for (const point of forecast) {
    const localDateTimeParts = parseOffsetIsoDateTime(point.time_local);

    if (!localDateTimeParts || localDateTimeParts.dateKey !== todayDateKey) {
      continue;
    }

    todayMaxRisk = Math.max(
      todayMaxRisk,
      point.heat_risk.risk_level_interpolated,
    );
  }

  return Number.isFinite(todayMaxRisk) ? todayMaxRisk : null;
}

/**
 * Derives current and today-max risk levels from a forecast payload.
 */
export function deriveDashboardRiskLevels(
  forecast: readonly ForecastApiPoint[] | null | undefined,
): DashboardDerivedRiskLevels | null {
  if (!forecast || forecast.length === 0) {
    return null;
  }

  const currentRiskLevelInterpolated = getCurrentRiskFromForecast(forecast);
  const todayMaxRiskLevelInterpolated = getTodayMaxRiskFromForecast(forecast);

  if (
    currentRiskLevelInterpolated === null ||
    todayMaxRiskLevelInterpolated === null
  ) {
    return null;
  }

  return {
    currentRiskLevelInterpolated,
    todayMaxRiskLevelInterpolated,
  };
}
