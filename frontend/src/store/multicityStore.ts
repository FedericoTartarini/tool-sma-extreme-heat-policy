import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import {
  createSavedLocationFromSuggestion,
  type AddLocationResult,
  type SavedLocation,
  validateAddSavedLocation,
} from "@/domain/multicity";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";

export interface MulticityStoreBootstrapPayload {
  sport: SportType;
  locations: SavedLocation[];
}

interface MulticityStoreState {
  isBootstrapped: boolean;
  sport: SportType;
  locations: SavedLocation[];
  locationSearchInput: string;
  locationSessionToken: string;

  bootstrap: (payload: MulticityStoreBootstrapPayload) => void;
  setSport: (sport: SportType) => void;
  setLocationSearchInput: (value: string) => void;
  addLocation: (suggestion: LocationSuggestion) => AddLocationResult;
  removeLocation: (locationId: string) => void;
  moveLocationUp: (locationId: string) => void;
  moveLocationDown: (locationId: string) => void;
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

function reorderLocations(
  locations: SavedLocation[],
  locationId: string,
  direction: -1 | 1,
): SavedLocation[] {
  const currentIndex = locations.findIndex(
    (location) => location.id === locationId,
  );

  if (currentIndex === -1) {
    return locations;
  }

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= locations.length) {
    return locations;
  }

  const nextLocations = [...locations];
  const [movedLocation] = nextLocations.splice(currentIndex, 1);
  nextLocations.splice(targetIndex, 0, movedLocation);
  return nextLocations;
}

/**
 * Central multi-city dashboard store for sport and saved locations.
 */
export const useMulticityStore = create<MulticityStoreState>((set, get) => ({
  isBootstrapped: false,
  sport: DEFAULT_SPORT_TYPE,
  locations: [],
  locationSearchInput: "",
  locationSessionToken: createSessionToken(),

  bootstrap: ({ sport, locations }) => {
    set({
      isBootstrapped: true,
      sport,
      locations,
      locationSearchInput: "",
      locationSessionToken: createSessionToken(),
    });
  },

  setSport: (sport) => {
    set({ sport });
  },

  setLocationSearchInput: (value) => {
    const trimmedValue = value.trim();
    const previousValue = get().locationSearchInput.trim();
    const shouldRefreshSessionToken =
      trimmedValue.length > 0 && previousValue.length === 0;

    set((state) => ({
      locationSearchInput: value,
      locationSessionToken: shouldRefreshSessionToken
        ? createSessionToken()
        : state.locationSessionToken,
    }));
  },

  addLocation: (suggestion) => {
    const validation = validateAddSavedLocation(get().locations, suggestion);
    if (!validation.ok) {
      return validation;
    }

    const savedLocation = createSavedLocationFromSuggestion({
      ...suggestion,
      latitude: suggestion.latitude as number,
      longitude: suggestion.longitude as number,
    });

    set((state) => ({
      locations: [...state.locations, savedLocation],
      locationSearchInput: "",
    }));

    return { ok: true };
  },

  removeLocation: (locationId) => {
    set((state) => ({
      locations: state.locations.filter(
        (location) => location.id !== locationId,
      ),
    }));
  },

  moveLocationUp: (locationId) => {
    set((state) => ({
      locations: reorderLocations(state.locations, locationId, -1),
    }));
  },

  moveLocationDown: (locationId) => {
    set((state) => ({
      locations: reorderLocations(state.locations, locationId, 1),
    }));
  },
}));
