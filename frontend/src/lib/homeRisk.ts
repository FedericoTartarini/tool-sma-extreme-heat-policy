import type {
  ForecastApiPoint,
  HeatRiskApiData,
  HeatRiskApiLocation,
  HeatRiskApiResponse,
} from "@/api/heatRisk";
import type { ForecastDay, HeatRisk } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { toCoordinatesOrNull } from "@/lib/coordinates";

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

function getBrowserTimeZone(): string | undefined {
  if (typeof Intl === "undefined") {
    return undefined;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatDateParts(
  date: Date,
  timeZone?: string,
): Record<"year" | "month" | "day" | "hour" | "minute", string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
    hour: parts.find((part) => part.type === "hour")?.value ?? "",
    minute: parts.find((part) => part.type === "minute")?.value ?? "",
  };
}

/**
 * Groups forecast points into location-local daily chart data for the UI.
 */
export function toForecastDays(
  points: ForecastApiPoint[],
  timeZone?: string,
): ForecastDay[] {
  if (points.length === 0) {
    return [];
  }

  const resolvedTimeZone = timeZone ?? getBrowserTimeZone();
  const groupedDays = new Map<
    string,
    {
      date: string;
      maxRisk: number;
      points: ForecastDay["points"];
    }
  >();

  for (const point of points) {
    const parsedDate = new Date(point.time_utc);

    if (Number.isNaN(parsedDate.getTime())) {
      continue;
    }

    const dateParts = formatDateParts(parsedDate, resolvedTimeZone);
    const dateKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const timeLabel = `${dateParts.hour}:${dateParts.minute}`;
    const pointRisk = point.heat_risk.risk_level_interpolated;
    const existingDay = groupedDays.get(dateKey);

    if (!existingDay) {
      groupedDays.set(dateKey, {
        date: point.time_utc,
        maxRisk: pointRisk,
        points: [
          {
            time: timeLabel,
            value: pointRisk,
          },
        ],
      });
      continue;
    }

    existingDay.maxRisk = Math.max(existingDay.maxRisk, pointRisk);
    existingDay.points.push({
      time: timeLabel,
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
