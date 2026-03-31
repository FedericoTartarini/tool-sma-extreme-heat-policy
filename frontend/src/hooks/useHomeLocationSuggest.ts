import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { HomeSuggestErrorReason } from "@/domain/homeErrorMap";
import type { LocationSuggestion } from "@/domain/location";
import { useHomeStore } from "@/store/homeStore";

const MIN_LOCATION_QUERY_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 500;
const EMPTY_SUGGESTIONS: LocationSuggestion[] = [];

export type LocationSuggestErrorReason = HomeSuggestErrorReason;

interface UseHomeLocationSuggestResult {
  locationSearchInput: string;
  suggestionLabels: string[];
  isSuggestLoading: boolean;
  suggestErrorReason: LocationSuggestErrorReason | null;
  onLocationSearchInputChange: (value: string) => void;
  onLocationOptionSubmit: (value: string) => void;
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

function dedupeSuggestionsByLabel(
  suggestions: LocationSuggestion[],
): LocationSuggestion[] {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const value = suggestion.formattedLocation.trim();
    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function normalizeLocationLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");
}

function findExactNormalizedSuggestion(
  suggestions: LocationSuggestion[],
  value: string,
): LocationSuggestion | null {
  const normalizedValue = normalizeLocationLabel(value);
  if (!normalizedValue) {
    return null;
  }

  return (
    suggestions.find(
      (suggestion) =>
        normalizeLocationLabel(suggestion.formattedLocation) ===
        normalizedValue,
    ) ?? null
  );
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
  value: string,
): LocationSuggestion | null {
  return (
    suggestions.find((suggestion) => suggestion.formattedLocation === value) ??
    null
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
  const selectedLocationValue =
    selectedLocation?.formattedLocation.trim() ?? "";
  const language = useMemo(() => getLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const queryForRequest = debouncedQuery.trim();
  const hasDebounced = queryForRequest === query;

  const shouldSuggest = shouldRunSuggestQuery({
    hasMapboxToken,
    hasDebounced,
    queryForRequest,
    selectedLocationValue,
  });

  const suggestQuery = useQuery({
    queryKey: ["mapboxSuggest", queryForRequest, sessionToken, language],
    queryFn: async ({ signal }) => {
      const suggestions = await suggestLocations({
        query: queryForRequest,
        accessToken: mapboxAccessToken,
        sessionToken,
        signal,
        language,
      });

      return dedupeSuggestionsByLabel(suggestions);
    },
    enabled: shouldSuggest,
  });

  const suggestions = suggestQuery.data ?? EMPTY_SUGGESTIONS;
  const suggestionLabels = useMemo(
    () => suggestions.map((item) => item.formattedLocation),
    [suggestions],
  );

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

    if (suggestions.length === 0) {
      setHasPrefilledLocationNotMatched(false);
      return;
    }

    const exactMatchedSuggestion = findExactNormalizedSuggestion(
      suggestions,
      query,
    );
    const selectedSuggestion =
      exactMatchedSuggestion ??
      (locationPrefillSource === "default" ? (suggestions[0] ?? null) : null);

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
    hasPrefilledNotMatched,
    locationPrefillSource,
    mapboxAccessToken,
    query,
    queryForRequest,
    setHasPrefilledLocationNotMatched,
    selectLocation,
    selectedLocation,
    shouldAutoResolvePrefilledLocation,
    suggestQuery.isSuccess,
    suggestions,
  ]);

  const suggestErrorReason = toSuggestErrorReason({
    hasMapboxToken,
    hasRetrieveError,
    hasPrefilledNotMatched,
    shouldSuggest,
    isSuggestError: suggestQuery.isError,
    isSuggestSuccess: suggestQuery.isSuccess,
    suggestionCount: suggestions.length,
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

  const onLocationOptionSubmit = (value: string) => {
    if (hasPrefilledNotMatched) {
      setHasPrefilledLocationNotMatched(false);
    }
    const selectedSuggestion = findSubmittedSuggestion(suggestions, value);

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
    suggestionLabels,
    isSuggestLoading: shouldSuggest && suggestQuery.isFetching,
    suggestErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  };
}
