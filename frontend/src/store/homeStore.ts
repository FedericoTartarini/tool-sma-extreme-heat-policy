import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import {
  DEFAULT_HEAT_RISK_PROFILE,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";

export type HomeChannel = "shared" | "direct";
export type LocationPrefillSource = "url" | "persisted" | "default" | "none";
export type PrefilledLocationResolveState =
  | "idle"
  | "pending"
  | "resolving"
  | "not_found"
  | "not_matched";

export interface HomeStoreBootstrapPayload {
  channel: HomeChannel;
  profile: HeatRiskProfile;
  sport: SportType;
  locationSearchInput: string;
  locationPrefillSource: LocationPrefillSource;
  prefilledLocationResolveState: PrefilledLocationResolveState;
}

interface HomeStoreState {
  isBootstrapped: boolean;
  channel: HomeChannel;
  profile: HeatRiskProfile;
  sport: SportType;
  locationSearchInput: string;
  locationPrefillSource: LocationPrefillSource;
  selectedLocation: LocationSuggestion | null;
  prefilledLocationResolveState: PrefilledLocationResolveState;
  locationSessionToken: string;

  bootstrap: (payload: HomeStoreBootstrapPayload) => void;
  setProfile: (profile: HeatRiskProfile) => void;
  setSport: (sport: SportType) => void;
  setLocationSearchInput: (value: string) => void;
  selectLocation: (suggestion: LocationSuggestion) => void;
  startPrefilledLocationResolve: () => void;
  finishPrefilledLocationResolve: () => void;
  markPrefilledLocationNotFound: () => void;
  markPrefilledLocationNotMatched: () => void;
}

function createSessionToken(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Central Home store for filters and applied selection.
 */
export const useHomeStore = create<HomeStoreState>((set) => ({
  isBootstrapped: false,
  channel: "direct",
  profile: DEFAULT_HEAT_RISK_PROFILE,
  sport: DEFAULT_SPORT_TYPE,
  locationSearchInput: "",
  locationPrefillSource: "none",
  selectedLocation: null,
  prefilledLocationResolveState: "idle",
  locationSessionToken: createSessionToken(),

  bootstrap: ({
    channel,
    profile,
    sport,
    locationSearchInput,
    locationPrefillSource,
    prefilledLocationResolveState,
  }) =>
    set({
      isBootstrapped: true,
      channel,
      profile,
      sport,
      locationSearchInput,
      locationPrefillSource,
      selectedLocation: null,
      prefilledLocationResolveState,
      locationSessionToken: createSessionToken(),
    }),
  setProfile: (profile) => set({ profile }),
  setSport: (sport) => set({ sport }),
  setLocationSearchInput: (value) =>
    set((state) => {
      const selectedLocationValue = state.selectedLocation?.displayLabel ?? "";
      const shouldClearSelectedLocation =
        Boolean(state.selectedLocation) && value !== selectedLocationValue;
      const isStartingNewSearch =
        Boolean(state.selectedLocation) &&
        state.locationSearchInput === selectedLocationValue &&
        value !== selectedLocationValue;

      return {
        locationSearchInput: value,
        locationPrefillSource: "none",
        ...(shouldClearSelectedLocation ? { selectedLocation: null } : {}),
        prefilledLocationResolveState: "idle",
        ...(isStartingNewSearch
          ? { locationSessionToken: createSessionToken() }
          : {}),
      };
    }),
  selectLocation: (suggestion) =>
    set({
      selectedLocation: suggestion,
      locationSearchInput: suggestion.displayLabel,
      locationPrefillSource: "none",
      prefilledLocationResolveState: "idle",
    }),
  startPrefilledLocationResolve: () =>
    set({ prefilledLocationResolveState: "resolving" }),
  finishPrefilledLocationResolve: () =>
    set({ prefilledLocationResolveState: "idle" }),
  markPrefilledLocationNotFound: () =>
    set({ prefilledLocationResolveState: "not_found" }),
  markPrefilledLocationNotMatched: () =>
    set({ prefilledLocationResolveState: "not_matched" }),
}));
