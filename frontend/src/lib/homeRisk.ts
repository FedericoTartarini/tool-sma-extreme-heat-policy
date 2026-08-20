import type {
  ForecastApiPoint,
  ForecastInputsApiData,
  HeatRiskApiData,
  HeatRiskApiLocation,
  HeatRiskApiResponse,
} from "@/api/heatRisk";
import type { EnvironmentalInputs } from "@/domain/environmental";
import type { ForecastDay, HeatRisk } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { toCoordinatesOrNull } from "@/lib/coordinates";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

export interface HeatRiskMeta {
  latitude?: number;
  longitude?: number;
  timeZone?: string;
}

/**
 * Maps raw heat-risk API data into the frontend domain model.
 */
export function toHeatRisk(api: HeatRiskApiData): HeatRisk {
  return {
    riskLevelInterpolated: api.risk_level_interpolated,
    mediumThreshold: api.t_medium,
    highThreshold: api.t_high,
    extremeThreshold: api.t_extreme,
    recommendation: api.recommendation,
  };
}

/**
 * Maps backend forecast input keys (snake_case) into camelCase domain fields.
 */
export function toEnvironmentalInputs(
  api: ForecastInputsApiData,
): EnvironmentalInputs {
  return {
    airTemperatureC: api.air_temperature_c,
    meanRadiantTemperatureC: api.mean_radiant_temperature_c,
    relativeHumidityPct: api.relative_humidity_pct,
    windSpeed10mMs: api.wind_speed_10m_ms,
    directNormalIrradianceWm2: api.direct_normal_irradiance_wm2,
  };
}

/**
 * Returns environmental inputs for the backend-defined current forecast point.
 */
export function getCurrentEnvironmentalInputs(
  response: HeatRiskApiResponse,
): EnvironmentalInputs {
  return toEnvironmentalInputs(getCurrentForecastPoint(response).inputs);
}

/**
 * Returns the backend's canonical current point, defined as the earliest complete forecast entry.
 */
export function getCurrentForecastPoint(
  response: HeatRiskApiResponse,
): ForecastApiPoint {
  const [currentPoint] = response.forecast;

  if (!currentPoint) {
    throw new Error(
      "Heat-risk response must include at least one forecast point.",
    );
  }

  return currentPoint;
}

/**
 * Extracts optional coordinates and timezone from the response request.location block.
 */
export function toHeatRiskMeta(location: HeatRiskApiLocation): HeatRiskMeta {
  const coordinates = toCoordinatesOrNull({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const timeZone =
    typeof location.timezone === "string" && location.timezone.length > 0
      ? location.timezone
      : undefined;

  return {
    ...(coordinates
      ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }
      : {}),
    ...(timeZone ? { timeZone } : {}),
  };
}

/**
 * Groups forecast points into location-local daily chart data for the UI.
 */
export function toForecastDays(points: ForecastApiPoint[]): ForecastDay[] {
  if (points.length === 0) {
    return [];
  }

  const groupedDays = new Map<
    string,
    {
      date: string;
      maxRisk: number;
      points: ForecastDay["points"];
    }
  >();

  for (const point of points) {
    const localDateTimeParts = parseOffsetIsoDateTime(point.time_local);

    if (!localDateTimeParts) {
      throw new Error(
        "Heat-risk forecast point contained an invalid time_local value.",
      );
    }

    const pointRisk = point.heat_risk.risk_level_interpolated;
    const existingDay = groupedDays.get(localDateTimeParts.dateKey);

    if (!existingDay) {
      groupedDays.set(localDateTimeParts.dateKey, {
        date: point.time_local,
        maxRisk: pointRisk,
        points: [
          {
            time: localDateTimeParts.timeLabel,
            value: pointRisk,
          },
        ],
      });
      continue;
    }

    existingDay.maxRisk = Math.max(existingDay.maxRisk, pointRisk);
    existingDay.points.push({
      time: localDateTimeParts.timeLabel,
      value: pointRisk,
    });
  }

  return Array.from(groupedDays.values())
    .slice(0, 7)
    .map((day) => ({
      date: day.date,
      risk: toRiskLevel(day.maxRisk),
      points: day.points,
    }));
}
