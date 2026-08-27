import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useMemo } from "react";
import { ApiError, isApiError } from "@/api/apiErrors";
import { getRetryDelayMs, heatRiskRetryPolicy } from "@/api/apiRetryPolicy";
import { fetchHeatRiskBatch } from "@/api/heatRiskBatch";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import type { SavedLocation } from "@/domain/multicity";
import {
  buildMulticityLocationCoordsKey,
  indexBatchResultsByCoordinateKey,
  resolveMulticityCityCardState,
  type MulticityBatchFetchErrorReason,
  type MulticityCityCardState,
} from "@/domain/multicityBatch";
import { useMulticityStore } from "@/store/multicityStore";

interface UseMulticityHeatRiskResult {
  getCardState: (location: SavedLocation) => MulticityCityCardState;
  isFetching: boolean;
  hasLoadedBatch: boolean;
  refresh: () => Promise<boolean>;
}

function toMulticityBatchFetchErrorReason(
  error: unknown,
): MulticityBatchFetchErrorReason | null {
  if (!isApiError(error)) {
    return null;
  }

  return error.serverCode === "weather_provider_unavailable"
    ? "weather_provider_unavailable"
    : error.kind;
}

/**
 * Fetches batch heat-risk summaries for all saved multi-city locations.
 */
export function useMulticityHeatRisk(): UseMulticityHeatRiskResult {
  const sport = useMulticityStore((state) => state.sport);
  const locations = useMulticityStore((state) => state.locations);
  const [debouncedSport] = useDebouncedValue(sport, 250);
  const profile = DEFAULT_HEAT_RISK_PROFILE;

  const requestLocations = useMemo(
    () =>
      locations.map((location) => ({
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    [locations],
  );

  const locationCoordsKey = buildMulticityLocationCoordsKey(locations);

  const batchQuery = useQuery({
    queryKey: ["heatRiskBatch", debouncedSport, profile, locationCoordsKey],
    queryFn: async ({ signal }) => {
      const result = await fetchHeatRiskBatch(
        {
          sport: debouncedSport,
          profile,
          locations: requestLocations,
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

      return result.data;
    },
    enabled: locations.length > 0,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      failureCount < heatRiskRetryPolicy.maxRetries &&
      heatRiskRetryPolicy.shouldRetry(error),
    retryDelay: () => getRetryDelayMs({ scope: "heat_risk" }),
    staleTime: 0,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const indexedResults = useMemo(
    () =>
      batchQuery.data
        ? indexBatchResultsByCoordinateKey(batchQuery.data.locations)
        : null,
    [batchQuery.data],
  );

  const batchErrorReason = toMulticityBatchFetchErrorReason(batchQuery.error);
  const isInitialLoading = batchQuery.isPending && !batchQuery.data;
  const isDisplayedSportPending =
    sport !== debouncedSport ||
    (batchQuery.data != null && batchQuery.data.request.sport !== sport);
  const hasLoadedBatch = Boolean(
    locations.length > 0 &&
    batchQuery.data &&
    !batchQuery.isPlaceholderData &&
    sport === debouncedSport,
  );

  async function refresh(): Promise<boolean> {
    if (locations.length === 0 || sport !== debouncedSport) {
      return false;
    }

    const result = await batchQuery.refetch();

    return !result.isError;
  }

  function getCardState(location: SavedLocation): MulticityCityCardState {
    if (isInitialLoading || isDisplayedSportPending) {
      return { status: "loading" };
    }

    if (batchErrorReason && !batchQuery.data) {
      return {
        status: "batch_error",
        reason: batchErrorReason,
      };
    }

    return resolveMulticityCityCardState(location, indexedResults, {
      isFetching: batchQuery.isFetching,
    });
  }

  return {
    getCardState,
    isFetching: batchQuery.isFetching,
    hasLoadedBatch,
    refresh,
  };
}
