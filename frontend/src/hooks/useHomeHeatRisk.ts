import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import {
  DEFAULT_HEAT_RISK_PROFILE,
  buildHeatRiskRequest,
  fetchHeatRisk,
  type HeatRiskApiResponse,
  type HeatRiskErrorReason,
} from "@/api/heatRisk";
import type { HomeCalculationErrorReason } from "@/domain/homeErrorMap";
import type { ForecastDay, HeatRisk, RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { toCoordinatesOrNull } from "@/lib/coordinates";
import {
  getCurrentForecastPoint,
  toForecastDays,
  toHeatRisk,
  toHeatRiskMeta,
  type HeatRiskMeta,
} from "@/lib/homeRisk";
import { useHomeStore } from "@/store/homeStore";

export type HeatRiskCalculationErrorReason = HomeCalculationErrorReason;

class HeatRiskQueryError extends Error {
  reason: HeatRiskErrorReason;

  constructor(reason: HeatRiskErrorReason) {
    super(reason);
    this.reason = reason;
    this.name = "HeatRiskQueryError";
  }
}

interface UseHomeHeatRiskBaseResult {
  forecast: ForecastDay[];
  meta: HeatRiskMeta;
  isFetching: boolean;
  errorReason: HeatRiskCalculationErrorReason | null;
  refresh: () => Promise<boolean>;
}

interface UseHomeHeatRiskCalculatedResult extends UseHomeHeatRiskBaseResult {
  risk: HeatRisk;
  riskLevel: RiskLevel;
  hasCalculatedRisk: true;
  canSyncSelection: true;
}

interface UseHomeHeatRiskPendingResult extends UseHomeHeatRiskBaseResult {
  risk: null;
  riskLevel: null;
  hasCalculatedRisk: false;
  canSyncSelection: false;
}

type UseHomeHeatRiskResult =
  | UseHomeHeatRiskCalculatedResult
  | UseHomeHeatRiskPendingResult;

function toCalculatedHeatRisk(data: HeatRiskApiResponse): {
  risk: HeatRisk;
  riskLevel: RiskLevel;
  forecast: ForecastDay[];
  meta: HeatRiskMeta;
} {
  const currentPoint = getCurrentForecastPoint(data);
  const risk = toHeatRisk(currentPoint.heat_risk);
  const meta = toHeatRiskMeta(data.request.location);

  return {
    risk,
    riskLevel: toRiskLevel(risk.riskLevelInterpolated),
    forecast: toForecastDays(data.forecast, meta.timeZone),
    meta,
  };
}

/**
 * Auto-fetches heat risk for the selected Home sport + location.
 *
 * Keeps the last successful risk visible on API errors.
 */
export function useHomeHeatRisk(): UseHomeHeatRiskResult {
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const [debouncedSport] = useDebouncedValue(sport, 250);

  const locationCoordinates = toCoordinatesOrNull({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  });

  const riskQuery = useQuery({
    queryKey: [
      "heatRisk",
      debouncedSport,
      DEFAULT_HEAT_RISK_PROFILE,
      locationCoordinates?.latitude.toFixed(6) ?? "",
      locationCoordinates?.longitude.toFixed(6) ?? "",
    ],
    queryFn: async ({ signal }) => {
      const result = await fetchHeatRisk(
        buildHeatRiskRequest({
          sport: debouncedSport,
          latitude: locationCoordinates!.latitude,
          longitude: locationCoordinates!.longitude,
        }),
        { signal },
      );

      if (!result.ok) {
        throw new HeatRiskQueryError(result.reason);
      }

      return result;
    },
    enabled: Boolean(locationCoordinates),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const errorReason: HeatRiskCalculationErrorReason | null =
    selectedLocation && !locationCoordinates
      ? "missing_location_coordinates"
      : riskQuery.error instanceof HeatRiskQueryError
        ? riskQuery.error.reason
        : null;

  const calculated = riskQuery.data
    ? toCalculatedHeatRisk(riskQuery.data.data)
    : null;
  async function refresh(): Promise<boolean> {
    if (
      !locationCoordinates ||
      !debouncedSport ||
      sport !== debouncedSport ||
      !selectedLocation
    ) {
      return false;
    }

    const result = await riskQuery.refetch();

    return !result.isError;
  }

  const hasCalculatedRisk = Boolean(
    selectedLocation &&
    locationCoordinates &&
    calculated &&
    !riskQuery.isPlaceholderData &&
    sport === debouncedSport,
  );

  if (hasCalculatedRisk && calculated) {
    return {
      ...calculated,
      isFetching: riskQuery.isFetching,
      errorReason,
      refresh,
      hasCalculatedRisk: true,
      canSyncSelection: true,
    };
  }

  return {
    risk: null,
    riskLevel: null,
    forecast: [],
    meta: {},
    isFetching: riskQuery.isFetching,
    errorReason,
    refresh,
    hasCalculatedRisk: false,
    canSyncSelection: false,
  };
}
