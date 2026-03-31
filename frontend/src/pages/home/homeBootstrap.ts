import type { SportType } from "@/domain/sport";
import type { PersistedHomeFilters } from "@/pages/home/browserState";
import type {
  HomeChannel,
  HomeStoreBootstrapPayload,
  LocationPrefillSource,
} from "@/store/homeStore";

interface ResolveHomeBootstrapStateParams {
  hasUrlState: boolean;
  defaultSport: SportType;
  defaultLocationLabel: string;
  urlSport: SportType | null;
  urlLocation: string | null;
  persistedFilters: PersistedHomeFilters | null;
}

/**
 * Trims and normalizes initial location text from URL/storage.
 */
export function resolveInitialLocationLabel(
  label: string | null | undefined,
): string {
  return label?.trim() ?? "";
}

/**
 * Resolves Home bootstrap source priority between URL state and local storage.
 */
export function resolveHomeBootstrapState({
  hasUrlState,
  defaultSport,
  defaultLocationLabel,
  urlSport,
  urlLocation,
  persistedFilters,
}: ResolveHomeBootstrapStateParams): HomeStoreBootstrapPayload {
  const channel: HomeChannel = hasUrlState ? "shared" : "direct";

  let sport = defaultSport;
  let locationSearchInput = "";
  let locationPrefillSource: LocationPrefillSource = "none";

  if (channel === "shared") {
    if (urlSport) {
      sport = urlSport;
    }

    locationSearchInput = resolveInitialLocationLabel(urlLocation);
    if (locationSearchInput.length > 0) {
      locationPrefillSource = "url";
    }
  } else if (persistedFilters) {
    sport = persistedFilters.sport;
    locationSearchInput = resolveInitialLocationLabel(persistedFilters.loc);
    if (locationSearchInput.length > 0) {
      locationPrefillSource = "persisted";
    }
  } else {
    locationSearchInput = resolveInitialLocationLabel(defaultLocationLabel);
    if (locationSearchInput.length > 0) {
      locationPrefillSource = "default";
    }
  }

  const shouldAutoResolvePrefilledLocation = locationSearchInput.length > 0;

  return {
    channel,
    sport,
    locationSearchInput,
    locationPrefillSource,
    shouldAutoResolvePrefilledLocation,
  };
}
