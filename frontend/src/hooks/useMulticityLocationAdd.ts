import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { LocationSuggestion } from "@/domain/location";
import {
  LOCATION_SUGGEST_TYPES_PARAM,
  prepareLocationSuggestions,
} from "@/domain/locationSearch";
import { retrieveAndSelectLocation } from "@/hooks/homeLocationRetrieve";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import {
  MAX_SAVED_LOCATIONS,
  type AddLocationFailureReason,
} from "@/domain/multicity";
import { useMulticityStore } from "@/store/multicityStore";

const MIN_LOCATION_QUERY_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 800;
const EMPTY_SUGGESTIONS: LocationSuggestion[] = [];

export type MulticityLocationAddErrorReason =
  | "missing_token"
  | "retrieve_failed"
  | "unavailable"
  | "no_results"
  | AddLocationFailureReason;

interface UseMulticityLocationAddResult {
  locationSearchInput: string;
  locationSuggestions: LocationSuggestion[];
  isSuggestLoading: boolean;
  isAddingLocation: boolean;
  canAddMoreLocations: boolean;
  addErrorReason: MulticityLocationAddErrorReason | null;
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

function findSubmittedSuggestion(
  suggestions: LocationSuggestion[],
  suggestionId: string,
): LocationSuggestion | null {
  return (
    suggestions.find((suggestion) => suggestion.id === suggestionId) ?? null
  );
}

/**
 * Location suggest and add flow for the multi-city dashboard.
 */
export function useMulticityLocationAdd(): UseMulticityLocationAddResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const locationSearchInput = useMulticityStore(
    (state) => state.locationSearchInput,
  );
  const sessionToken = useMulticityStore((state) => state.locationSessionToken);
  const locations = useMulticityStore((state) => state.locations);
  const setLocationSearchInput = useMulticityStore(
    (state) => state.setLocationSearchInput,
  );
  const addLocation = useMulticityStore((state) => state.addLocation);
  const [hasRetrieveError, setHasRetrieveError] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [addErrorReason, setAddErrorReason] =
    useState<MulticityLocationAddErrorReason | null>(null);
  const retrieveController = useMemo(
    () => createLatestAbortableRequestController(),
    [],
  );

  const query = locationSearchInput.trim();
  const language = useMemo(() => getLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const debouncedQueryValue = debouncedQuery.trim();
  const hasDebounced = debouncedQueryValue === query;
  const canAddMoreLocations = locations.length < MAX_SAVED_LOCATIONS;

  const shouldSuggest =
    hasMapboxToken &&
    hasDebounced &&
    debouncedQueryValue.length >= MIN_LOCATION_QUERY_LENGTH &&
    canAddMoreLocations;

  const suggestQuery = useQuery({
    queryKey: [
      "mapboxSuggest",
      "multicity",
      debouncedQueryValue,
      sessionToken,
      language,
      LOCATION_SUGGEST_TYPES_PARAM,
    ],
    queryFn: async ({ signal }) => {
      const suggestions = await suggestLocations({
        query: debouncedQueryValue,
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

  const resolveSuggestErrorReason =
    (): MulticityLocationAddErrorReason | null => {
      if (!hasMapboxToken) {
        return "missing_token";
      }

      if (hasRetrieveError) {
        return "retrieve_failed";
      }

      if (!shouldSuggest) {
        return null;
      }

      if (suggestQuery.isError) {
        return "unavailable";
      }

      if (suggestQuery.isSuccess && dedupedSuggestions.length === 0) {
        return "no_results";
      }

      return null;
    };

  const addResolvedSuggestion = async (
    selectedSuggestion: LocationSuggestion,
  ) => {
    setIsAddingLocation(true);
    setAddErrorReason(null);

    const mapboxId = selectedSuggestion.mapboxId;
    const suggestionSessionToken = selectedSuggestion.sessionToken;

    if (!mapboxId || !suggestionSessionToken || !hasMapboxToken) {
      setHasRetrieveError(true);
      setIsAddingLocation(false);
      return;
    }

    const request = retrieveController.start();

    try {
      await retrieveAndSelectLocation({
        selectedSuggestion,
        hasMapboxToken,
        mapboxAccessToken,
        request,
        selectLocation: (resolvedSuggestion) => {
          const result = addLocation(resolvedSuggestion);
          if (!result.ok) {
            setAddErrorReason(result.reason);
            return;
          }

          setAddErrorReason(null);
        },
        setHasRetrieveError,
      });
    } finally {
      setIsAddingLocation(false);
    }
  };

  const onLocationSearchInputChange = (value: string) => {
    retrieveController.cancel();

    if (hasRetrieveError) {
      setHasRetrieveError(false);
    }

    if (addErrorReason) {
      setAddErrorReason(null);
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

    void addResolvedSuggestion(selectedSuggestion);
  };

  return {
    locationSearchInput,
    locationSuggestions: visibleSuggestions,
    isSuggestLoading: shouldSuggest && suggestQuery.isFetching,
    isAddingLocation,
    canAddMoreLocations,
    addErrorReason: addErrorReason ?? resolveSuggestErrorReason(),
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  };
}
