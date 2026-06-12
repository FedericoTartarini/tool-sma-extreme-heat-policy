import type { HeatRiskProfile } from "@/domain/heatRiskProfile";
import type { SportType } from "@/domain/sport";
import type { PersistedHomeFilters } from "@/pages/home/browserState";
import type {
  HomeChannel,
  HomeStoreBootstrapPayload,
  LocationPrefillSource,
  PrefilledLocationResolveState,
} from "@/store/homeStore";

interface ResolveHomeBootstrapStateParams {
  hasUrlState: boolean;
  defaultProfile: HeatRiskProfile;
  defaultSport: SportType;
  defaultLocationLabel: string;
  urlProfile: HeatRiskProfile | null;
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
  defaultProfile,
  defaultSport,
  defaultLocationLabel,
  urlSport,
  urlLocation,
  persistedFilters,
}: ResolveHomeBootstrapStateParams): HomeStoreBootstrapPayload {
  const channel: HomeChannel = hasUrlState ? "shared" : "direct";

  const profile = defaultProfile;
  /*
  let profile = defaultProfile;
  */
  let sport = defaultSport;
  let locationSearchInput = "";
  let locationPrefillSource: LocationPrefillSource = "none";

  if (channel === "shared") {
    /*
    if (urlProfile) {
      profile = urlProfile;
    }
    */
    if (urlSport) {
      sport = urlSport;
    }

    locationSearchInput = resolveInitialLocationLabel(urlLocation);
    if (locationSearchInput.length > 0) {
      locationPrefillSource = "url";
    }
  } else if (persistedFilters) {
    /*
    profile = persistedFilters.profile ?? defaultProfile;
    */
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

  const prefilledLocationResolveState: PrefilledLocationResolveState =
    locationSearchInput.length > 0 ? "pending" : "idle";

  return {
    channel,
    profile,
    sport,
    locationSearchInput,
    locationPrefillSource,
    prefilledLocationResolveState,
  };
}
