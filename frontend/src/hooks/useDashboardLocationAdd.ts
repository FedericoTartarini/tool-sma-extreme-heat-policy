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
  findLocationSuggestionById,
  getLocationLanguagePreference,
  LOCATION_SUGGEST_DEBOUNCE_MS,
  LOCATION_SUGGEST_TYPES_PARAM,
  MIN_LOCATION_QUERY_LENGTH,
  prepareLocationSuggestions,
} from "@/domain/locationSearch";
import { retrieveAndSelectLocation } from "@/hooks/homeLocationRetrieve";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";
import { useDashboardStore } from "@/store/dashboardStore";

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
  onAddCardClick: () => DashboardLocationAddErrorReason | null;
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
  const language = useMemo(() => getLocationLanguagePreference(), []);
  const [debouncedQuery] = useDebouncedValue(
    query,
    LOCATION_SUGGEST_DEBOUNCE_MS,
  );
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
        selectLocation: setDraftLocation,
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

    setLocationSearchInput(value);
  };

  const onLocationOptionSubmit = (suggestionId: string) => {
    const selectedSuggestion = findLocationSuggestionById(
      dedupedSuggestions,
      suggestionId,
    );

    if (!selectedSuggestion) {
      return;
    }

    void resolveDraftLocation(selectedSuggestion);
  };

  const onAddCardClick = (): DashboardLocationAddErrorReason | null => {
    if (!canAddMoreCards) {
      return "max_reached";
    }

    if (!hasResolvedCoordinates(draftLocation)) {
      return "missing_draft_location";
    }

    if (scheduleDraft.status !== "complete") {
      return "invalid_schedule";
    }

    const result = addCard(draftSport, draftLocation, scheduleDraft.schedule);
    if (!result.ok) {
      return result.reason;
    }

    setDraftWeekdays([]);
    setDraftStartMinutes(null);
    setDraftEndMinutes(null);
    return null;
  };

  return {
    locationSearchInput,
    locationSuggestions: visibleSuggestions,
    isSuggestLoading: shouldSuggest && suggestQuery.isFetching,
    isResolvingLocation,
    isShowingCommittedDraftLocation,
    canAddMoreCards,
    canSubmitAdd,
    addErrorReason: resolveSuggestErrorReason(),
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
