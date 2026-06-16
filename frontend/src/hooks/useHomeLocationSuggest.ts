import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { HomeSuggestErrorReason } from "@/domain/homeErrorMap";
import type { LocationSuggestion } from "@/domain/location";
import {
  LOCATION_SUGGEST_TYPES_PARAM,
  prepareLocationSuggestions,
  resolvePrefilledLocationSuggestion,
  shouldOpenPrefilledLocationDropdown,
  toPrefilledLocationSuggestQuery,
} from "@/domain/locationSearch";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import { retrieveAndSelectLocation } from "@/hooks/homeLocationRetrieve";
import { useHomeStore } from "@/store/homeStore";

const MIN_LOCATION_QUERY_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 800;
const EMPTY_SUGGESTIONS: LocationSuggestion[] = [];

export type LocationSuggestErrorReason = HomeSuggestErrorReason;

interface UseHomeLocationSuggestResult {
  locationSearchInput: string;
  locationSuggestions: LocationSuggestion[];
  isSuggestLoading: boolean;
  shouldOpenLocationDropdown: boolean;
  suggestErrorReason: LocationSuggestErrorReason | null;
  onLocationSearchInputChange: (value: string) => void;
  onLocationOptionSubmit: (suggestionId: string) => void;
}

function getLanguagePreference(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages.join(",");
  }

  return navigator.language || undefined;
}

function shouldRunSuggestQuery(params: {
  hasMapboxToken: boolean;
  hasDebounced: boolean;
  queryForRequest: string;
  selectedLocationValue: string;
}): boolean {
  const {
    hasMapboxToken,
    hasDebounced,
    queryForRequest,
    selectedLocationValue,
  } = params;

  return (
    hasMapboxToken &&
    hasDebounced &&
    queryForRequest.length >= MIN_LOCATION_QUERY_LENGTH &&
    !(selectedLocationValue && queryForRequest === selectedLocationValue)
  );
}

function toSuggestErrorReason(params: {
  hasMapboxToken: boolean;
  hasRetrieveError: boolean;
  hasPrefilledNotMatched: boolean;
  shouldSuggest: boolean;
  isSuggestError: boolean;
  isSuggestSuccess: boolean;
  suggestionCount: number;
}): LocationSuggestErrorReason | null {
  const {
    hasMapboxToken,
    hasRetrieveError,
    hasPrefilledNotMatched,
    shouldSuggest,
    isSuggestError,
    isSuggestSuccess,
    suggestionCount,
  } = params;

  if (!hasMapboxToken) {
    return "missing_token";
  }

  if (hasRetrieveError) {
    return "retrieve_failed";
  }

  if (hasPrefilledNotMatched) {
    return "prefilled_location_not_matched";
  }

  if (!shouldSuggest) {
    return null;
  }

  if (isSuggestError) {
    return "unavailable";
  }

  if (isSuggestSuccess && suggestionCount === 0) {
    return "no_results";
  }

  return null;
}

function findSubmittedSuggestion(
  suggestions: LocationSuggestion[],
  suggestionId: string,
): LocationSuggestion | null {
  return (
    suggestions.find((suggestion) => suggestion.id === suggestionId) ?? null
  );
}

/**
 * Query-driven location suggest hook for Home.
 */
export function useHomeLocationSuggest(): UseHomeLocationSuggestResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const locationSearchInput = useHomeStore(
    (state) => state.locationSearchInput,
  );
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const prefilledLocationResolveState = useHomeStore(
    (state) => state.prefilledLocationResolveState,
  );
  const locationPrefillSource = useHomeStore(
    (state) => state.locationPrefillSource,
  );
  const sessionToken = useHomeStore((state) => state.locationSessionToken);
  const setLocationSearchInput = useHomeStore(
    (state) => state.setLocationSearchInput,
  );
  const selectLocation = useHomeStore((state) => state.selectLocation);
  const startPrefilledLocationResolve = useHomeStore(
    (state) => state.startPrefilledLocationResolve,
  );
  const finishPrefilledLocationResolve = useHomeStore(
    (state) => state.finishPrefilledLocationResolve,
  );
  const markPrefilledLocationNotFound = useHomeStore(
    (state) => state.markPrefilledLocationNotFound,
  );
  const markPrefilledLocationNotMatched = useHomeStore(
    (state) => state.markPrefilledLocationNotMatched,
  );
  const [hasRetrieveError, setHasRetrieveError] = useState(false);
  const retrieveController = useMemo(
    () => createLatestAbortableRequestController(),
    [],
  );

  const query = locationSearchInput.trim();
  const selectedLocationValue = selectedLocation?.displayLabel.trim() ?? "";
  const language = useMemo(() => getLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const debouncedQueryValue = debouncedQuery.trim();
  const hasRestoredPrefillSource =
    locationPrefillSource === "url" || locationPrefillSource === "persisted";
  const isPrefilledLocationResolvePending =
    prefilledLocationResolveState === "pending";
  const hasActivePrefilledLocationResolve =
    prefilledLocationResolveState !== "idle";
  const hasPrefilledNotMatched =
    prefilledLocationResolveState === "not_matched";
  const shouldUsePrefilledSuggestQuery =
    hasRestoredPrefillSource && hasActivePrefilledLocationResolve;
  const queryForRequest = shouldUsePrefilledSuggestQuery
    ? toPrefilledLocationSuggestQuery(debouncedQueryValue)
    : debouncedQueryValue;
  const hasDebounced = debouncedQueryValue === query;

  const shouldSuggest = shouldRunSuggestQuery({
    hasMapboxToken,
    hasDebounced,
    queryForRequest,
    selectedLocationValue,
  });

  const suggestQuery = useQuery({
    queryKey: [
      "mapboxSuggest",
      queryForRequest,
      sessionToken,
      language,
      LOCATION_SUGGEST_TYPES_PARAM,
    ],
    queryFn: async ({ signal }) => {
      const suggestions = await suggestLocations({
        query: queryForRequest,
        accessToken: mapboxAccessToken,
        sessionToken,
        signal,
        language,
        types: LOCATION_SUGGEST_TYPES_PARAM,
      });

      return prepareLocationSuggestions({
        suggestions,
      });
    },
    enabled: shouldSuggest,
    retry: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const dedupedSuggestions =
    suggestQuery.data?.dedupedSuggestions ?? EMPTY_SUGGESTIONS;
  const visibleSuggestions =
    suggestQuery.data?.visibleSuggestions ?? EMPTY_SUGGESTIONS;

  useEffect(() => () => retrieveController.cancel(), [retrieveController]);

  useEffect(() => {
    if (!isPrefilledLocationResolvePending) {
      return;
    }

    if (!hasDebounced || !queryForRequest || selectedLocation) {
      return;
    }

    if (!suggestQuery.isSuccess) {
      return;
    }

    startPrefilledLocationResolve();

    if (dedupedSuggestions.length === 0) {
      markPrefilledLocationNotFound();
      return;
    }

    const selectedSuggestion = resolvePrefilledLocationSuggestion({
      suggestions: dedupedSuggestions,
      value: query,
      prefillSource: locationPrefillSource,
    });

    if (!selectedSuggestion) {
      markPrefilledLocationNotMatched();
      return;
    }

    void retrieveAndSelectLocation({
      selectedSuggestion,
      hasMapboxToken,
      mapboxAccessToken,
      request: retrieveController.start(),
      selectLocation,
      setHasRetrieveError,
    }).finally(() => {
      finishPrefilledLocationResolve();
    });
  }, [
    finishPrefilledLocationResolve,
    hasDebounced,
    hasMapboxToken,
    isPrefilledLocationResolvePending,
    locationPrefillSource,
    markPrefilledLocationNotFound,
    markPrefilledLocationNotMatched,
    mapboxAccessToken,
    query,
    queryForRequest,
    dedupedSuggestions,
    retrieveController,
    selectLocation,
    selectedLocation,
    startPrefilledLocationResolve,
    suggestQuery.isSuccess,
  ]);

  const suggestErrorReason = toSuggestErrorReason({
    hasMapboxToken,
    hasRetrieveError,
    hasPrefilledNotMatched,
    shouldSuggest,
    isSuggestError: suggestQuery.isError,
    isSuggestSuccess: suggestQuery.isSuccess,
    suggestionCount: dedupedSuggestions.length,
  });
  const shouldOpenLocationDropdown =
    hasPrefilledNotMatched &&
    shouldOpenPrefilledLocationDropdown({
      suggestions: dedupedSuggestions,
      visibleSuggestions,
      value: query,
      prefillSource: locationPrefillSource,
      isSuggestSuccess: suggestQuery.isSuccess,
    });

  const onLocationSearchInputChange = (value: string) => {
    retrieveController.cancel();

    if (hasRetrieveError) {
      setHasRetrieveError(false);
    }
    setLocationSearchInput(value);
  };

  const onLocationOptionSubmit = (suggestionId: string) => {
    const selectedSuggestion = findSubmittedSuggestion(
      dedupedSuggestions,
      suggestionId,
    );

    if (!selectedSuggestion) {
      return;
    }

    const shouldFinishPrefilledResolve = hasActivePrefilledLocationResolve;

    if (shouldFinishPrefilledResolve) {
      startPrefilledLocationResolve();
    }

    void retrieveAndSelectLocation({
      selectedSuggestion,
      hasMapboxToken,
      mapboxAccessToken,
      request: retrieveController.start(),
      selectLocation,
      setHasRetrieveError,
    }).finally(() => {
      if (shouldFinishPrefilledResolve) {
        finishPrefilledLocationResolve();
      }
    });
  };

  return {
    locationSearchInput,
    locationSuggestions: visibleSuggestions,
    isSuggestLoading: shouldSuggest && suggestQuery.isFetching,
    shouldOpenLocationDropdown,
    suggestErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  };
}
