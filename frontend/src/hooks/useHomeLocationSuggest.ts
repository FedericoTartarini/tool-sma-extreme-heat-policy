import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
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

async function retrieveAndSelectLocation(params: {
  selectedSuggestion: LocationSuggestion;
  hasMapboxToken: boolean;
  mapboxAccessToken: string;
  selectLocation: (suggestion: LocationSuggestion) => void;
  setHasRetrieveError: (hasError: boolean) => void;
}): Promise<void> {
  const {
    selectedSuggestion,
    hasMapboxToken,
    mapboxAccessToken,
    selectLocation,
    setHasRetrieveError,
  } = params;
  const mapboxId = selectedSuggestion.mapboxId;
  const sessionToken = selectedSuggestion.sessionToken;

  if (!mapboxId || !sessionToken || !hasMapboxToken) {
    setHasRetrieveError(true);
    return;
  }

  try {
    const coordinates = await retrieveLocationCoordinates({
      mapboxId,
      accessToken: mapboxAccessToken,
      sessionToken,
    });
    setHasRetrieveError(false);
    selectLocation({
      ...selectedSuggestion,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  } catch {
    setHasRetrieveError(true);
  }
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
  const shouldAutoResolvePrefilledLocation = useHomeStore(
    (state) => state.shouldAutoResolvePrefilledLocation,
  );
  const locationPrefillSource = useHomeStore(
    (state) => state.locationPrefillSource,
  );
  const hasPrefilledNotMatched = useHomeStore(
    (state) => state.hasPrefilledLocationNotMatched,
  );
  const sessionToken = useHomeStore((state) => state.locationSessionToken);
  const setLocationSearchInput = useHomeStore(
    (state) => state.setLocationSearchInput,
  );
  const selectLocation = useHomeStore((state) => state.selectLocation);
  const consumeAutoResolvePrefilledLocation = useHomeStore(
    (state) => state.consumeAutoResolvePrefilledLocation,
  );
  const setHasPrefilledLocationNotMatched = useHomeStore(
    (state) => state.setHasPrefilledLocationNotMatched,
  );
  const [hasRetrieveError, setHasRetrieveError] = useState(false);

  const query = locationSearchInput.trim();
  const selectedLocationValue = selectedLocation?.displayLabel.trim() ?? "";
  const language = useMemo(() => getLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const debouncedQueryValue = debouncedQuery.trim();
  const shouldUsePrefilledSuggestQuery =
    shouldAutoResolvePrefilledLocation &&
    (locationPrefillSource === "url" || locationPrefillSource === "persisted");
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
  });

  const dedupedSuggestions =
    suggestQuery.data?.dedupedSuggestions ?? EMPTY_SUGGESTIONS;
  const visibleSuggestions =
    suggestQuery.data?.visibleSuggestions ?? EMPTY_SUGGESTIONS;

  useEffect(() => {
    if (!shouldAutoResolvePrefilledLocation) {
      return;
    }

    if (!hasDebounced || !queryForRequest || selectedLocation) {
      return;
    }

    if (!suggestQuery.isSuccess) {
      return;
    }

    consumeAutoResolvePrefilledLocation();

    if (dedupedSuggestions.length === 0) {
      setHasPrefilledLocationNotMatched(false);
      return;
    }

    const selectedSuggestion = resolvePrefilledLocationSuggestion({
      suggestions: dedupedSuggestions,
      value: query,
      prefillSource: locationPrefillSource,
    });

    if (!selectedSuggestion) {
      setHasPrefilledLocationNotMatched(true);
      return;
    }

    setHasPrefilledLocationNotMatched(false);
    void retrieveAndSelectLocation({
      selectedSuggestion,
      hasMapboxToken,
      mapboxAccessToken,
      selectLocation,
      setHasRetrieveError,
    });
  }, [
    consumeAutoResolvePrefilledLocation,
    hasDebounced,
    hasMapboxToken,
    locationPrefillSource,
    mapboxAccessToken,
    query,
    queryForRequest,
    dedupedSuggestions,
    setHasPrefilledLocationNotMatched,
    selectLocation,
    selectedLocation,
    shouldAutoResolvePrefilledLocation,
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
    if (hasRetrieveError) {
      setHasRetrieveError(false);
    }
    if (hasPrefilledNotMatched) {
      setHasPrefilledLocationNotMatched(false);
    }
    setLocationSearchInput(value);
  };

  const onLocationOptionSubmit = (suggestionId: string) => {
    if (hasPrefilledNotMatched) {
      setHasPrefilledLocationNotMatched(false);
    }
    const selectedSuggestion = findSubmittedSuggestion(
      dedupedSuggestions,
      suggestionId,
    );

    if (!selectedSuggestion) {
      return;
    }

    void retrieveAndSelectLocation({
      selectedSuggestion,
      hasMapboxToken,
      mapboxAccessToken,
      selectLocation,
      setHasRetrieveError,
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
