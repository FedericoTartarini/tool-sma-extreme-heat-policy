import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { ApiError, isApiError } from "@/api/apiErrors";
import { getRetryDelayMs, heatRiskRetryPolicy } from "@/api/apiRetryPolicy";
import { fetchHeatRisk, type HeatRiskApiResponse } from "@/api/heatRisk";
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
    forecast: toForecastDays(data.forecast),
    meta,
  };
}

function toHeatRiskCalculationErrorReason(
  error: unknown,
): HeatRiskCalculationErrorReason | null {
  if (!isApiError(error)) {
    return null;
  }

  return error.serverCode === "weather_provider_unavailable"
    ? "weather_provider_unavailable"
    : error.kind;
}

/**
 * Auto-fetches heat risk for the selected Home sport + location.
 *
 * Keeps the last successful risk visible on API errors.
 */
export function useHomeHeatRisk(): UseHomeHeatRiskResult {
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const [debouncedSport] = useDebouncedValue(sport, 250);
  const [debouncedProfile] = useDebouncedValue(profile, 250);

  const locationCoordinates = toCoordinatesOrNull({
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  });

  const riskQuery = useQuery({
    queryKey: [
      "heatRisk",
      debouncedSport,
      debouncedProfile,
      locationCoordinates?.latitude.toFixed(6) ?? "",
      locationCoordinates?.longitude.toFixed(6) ?? "",
    ],
    queryFn: async ({ signal }) => {
      const result = await fetchHeatRisk(
        {
          sport: debouncedSport,
          latitude: locationCoordinates!.latitude,
          longitude: locationCoordinates!.longitude,
          profile: debouncedProfile,
        },
        { signal },
      );

      if (!result.ok) {
        throw new ApiError({
          kind:
            result.reason === "weather_provider_unavailable"
              ? "http_status"
              : result.reason,
          status: result.status,
          serverCode:
            result.reason === "weather_provider_unavailable"
              ? "weather_provider_unavailable"
              : undefined,
          message: result.reason,
        });
      }

      return result;
    },
    enabled: Boolean(locationCoordinates),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      failureCount < heatRiskRetryPolicy.maxRetries &&
      heatRiskRetryPolicy.shouldRetry(error),
    retryDelay: () => getRetryDelayMs({ scope: "heat_risk" }),
    staleTime: 0,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const errorReason: HeatRiskCalculationErrorReason | null =
    selectedLocation && !locationCoordinates
      ? "missing_location_coordinates"
      : toHeatRiskCalculationErrorReason(riskQuery.error);

  const calculated = riskQuery.data
    ? toCalculatedHeatRisk(riskQuery.data.data)
    : null;
  async function refresh(): Promise<boolean> {
    if (
      !locationCoordinates ||
      !debouncedSport ||
      !debouncedProfile ||
      sport !== debouncedSport ||
      profile !== debouncedProfile ||
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
    profile === debouncedProfile &&
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
