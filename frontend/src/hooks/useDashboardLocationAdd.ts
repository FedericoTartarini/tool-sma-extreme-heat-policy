import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { suggestLocations } from "@/api/mapboxSuggest";
import {
  canAddDashboardCard,
  resolveDashboardCardScheduleDraft,
  type AddDashboardCardFailureReason,
} from "@/domain/dashboard";
import type { LocationSuggestion } from "@/domain/location";
import type { Weekday } from "@/domain/weeklyWindow";
import {
  LOCATION_SUGGEST_TYPES_PARAM,
  prepareLocationSuggestions,
} from "@/domain/locationSearch";
import { retrieveAndSelectLocation } from "@/hooks/homeLocationRetrieve";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import { useDashboardStore } from "@/store/dashboardStore";

const MIN_LOCATION_QUERY_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 800;
const EMPTY_SUGGESTIONS: LocationSuggestion[] = [];

export type DashboardLocationAddErrorReason =
  | "missing_token"
  | "retrieve_failed"
  | "unavailable"
  | "no_results"
  | "missing_draft_location"
  | AddDashboardCardFailureReason;

interface UseDashboardLocationAddResult {
  locationSearchInput: string;
  locationSuggestions: LocationSuggestion[];
  isSuggestLoading: boolean;
  isResolvingLocation: boolean;
  isShowingCommittedDraftLocation: boolean;
  canAddMoreCards: boolean;
  canSubmitAdd: boolean;
  addErrorReason: DashboardLocationAddErrorReason | null;
  draftWeekdays: readonly Weekday[];
  draftStartMinutes: number | null;
  draftEndMinutes: number | null;
  onDraftWeekdaysChange: (weekdays: readonly Weekday[]) => void;
  onDraftStartMinutesChange: (minutes: number | null) => void;
  onDraftEndMinutesChange: (minutes: number | null) => void;
  onLocationSearchInputChange: (value: string) => void;
  onLocationOptionSubmit: (suggestionId: string) => void;
  onAddCardClick: () => void;
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

function hasResolvedCoordinates(
  suggestion: LocationSuggestion | null,
): suggestion is LocationSuggestion & { latitude: number; longitude: number } {
  return (
    suggestion !== null &&
    suggestion.latitude !== undefined &&
    suggestion.longitude !== undefined
  );
}

/**
 * Location suggest flow and explicit add-card action for the dashboard.
 */
export function useDashboardLocationAdd(): UseDashboardLocationAddResult {
  const mapboxAccessToken = (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? ""
  ).trim();
  const hasMapboxToken = mapboxAccessToken.length > 0;
  const locationSearchInput = useDashboardStore(
    (state) => state.locationSearchInput,
  );
  const sessionToken = useDashboardStore((state) => state.locationSessionToken);
  const draftSport = useDashboardStore((state) => state.draftSport);
  const draftLocation = useDashboardStore((state) => state.draftLocation);
  const cards = useDashboardStore((state) => state.cards);
  const setLocationSearchInput = useDashboardStore(
    (state) => state.setLocationSearchInput,
  );
  const setDraftLocation = useDashboardStore((state) => state.setDraftLocation);
  const addCard = useDashboardStore((state) => state.addCard);
  const [hasRetrieveError, setHasRetrieveError] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [addErrorReason, setAddErrorReason] =
    useState<DashboardLocationAddErrorReason | null>(null);
  const [draftWeekdays, setDraftWeekdays] = useState<readonly Weekday[]>([]);
  const [draftStartMinutes, setDraftStartMinutes] = useState<number | null>(
    null,
  );
  const [draftEndMinutes, setDraftEndMinutes] = useState<number | null>(null);
  const retrieveController = useMemo(
    () => createLatestAbortableRequestController(),
    [],
  );

  const query = locationSearchInput.trim();
  const draftLocationValue = draftLocation?.displayLabel.trim() ?? "";
  const language = useMemo(() => getLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const debouncedQueryValue = debouncedQuery.trim();
  const hasDebounced = debouncedQueryValue === query;
  const canAddMoreCards = canAddDashboardCard(cards);
  const isShowingCommittedDraftLocation =
    draftLocationValue.length > 0 && query === draftLocationValue;
  const scheduleDraft = resolveDashboardCardScheduleDraft({
    weekdays: draftWeekdays,
    startMinutes: draftStartMinutes,
    endMinutes: draftEndMinutes,
  });
  const canSubmitAdd =
    canAddMoreCards &&
    hasResolvedCoordinates(draftLocation) &&
    !isResolvingLocation &&
    scheduleDraft.status === "complete";

  const shouldSuggest =
    hasMapboxToken &&
    hasDebounced &&
    debouncedQueryValue.length >= MIN_LOCATION_QUERY_LENGTH &&
    canAddMoreCards &&
    !isShowingCommittedDraftLocation;

  const suggestQuery = useQuery({
    queryKey: [
      "mapboxSuggest",
      "dashboard",
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
  const visibleSuggestions = shouldSuggest
    ? (suggestQuery.data?.visibleSuggestions ?? EMPTY_SUGGESTIONS)
    : EMPTY_SUGGESTIONS;

  useEffect(() => () => retrieveController.cancel(), [retrieveController]);

  const resolveSuggestErrorReason =
    (): DashboardLocationAddErrorReason | null => {
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

  const resolveDraftLocation = async (
    selectedSuggestion: LocationSuggestion,
  ) => {
    setIsResolvingLocation(true);
    setAddErrorReason(null);

    const mapboxId = selectedSuggestion.mapboxId;
    const suggestionSessionToken = selectedSuggestion.sessionToken;

    if (!mapboxId || !suggestionSessionToken || !hasMapboxToken) {
      setHasRetrieveError(true);
      setIsResolvingLocation(false);
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
          setDraftLocation(resolvedSuggestion);
          setAddErrorReason(null);
        },
        setHasRetrieveError,
      });
    } finally {
      setIsResolvingLocation(false);
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

    void resolveDraftLocation(selectedSuggestion);
  };

  const onAddCardClick = () => {
    if (!canAddMoreCards) {
      setAddErrorReason("max_reached");
      return;
    }

    if (!hasResolvedCoordinates(draftLocation)) {
      setAddErrorReason("missing_draft_location");
      return;
    }

    if (scheduleDraft.status !== "complete") {
      setAddErrorReason("invalid_schedule");
      return;
    }

    const result = addCard(draftSport, draftLocation, scheduleDraft.schedule);
    if (!result.ok) {
      setAddErrorReason(result.reason);
      return;
    }

    setAddErrorReason(null);
    setDraftWeekdays([]);
    setDraftStartMinutes(null);
    setDraftEndMinutes(null);
  };

  return {
    locationSearchInput,
    locationSuggestions: visibleSuggestions,
    isSuggestLoading: shouldSuggest && suggestQuery.isFetching,
    isResolvingLocation,
    isShowingCommittedDraftLocation,
    canAddMoreCards,
    canSubmitAdd,
    addErrorReason: addErrorReason ?? resolveSuggestErrorReason(),
    draftWeekdays,
    draftStartMinutes,
    draftEndMinutes,
    onDraftWeekdaysChange: setDraftWeekdays,
    onDraftStartMinutesChange: setDraftStartMinutes,
    onDraftEndMinutesChange: setDraftEndMinutes,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
    onAddCardClick,
  };
}
