import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import type { SavedLocation, SaveLocationResult } from "@/domain/savedLocation";

interface SavedLocationsState {
  /** Newest first. Render in array order; do not sort in the UI. */
  savedLocations: readonly SavedLocation[];
  hydrate: () => void;
  saveLocation: (input: {
    label: string;
    location: LocationSuggestion;
  }) => SaveLocationResult;
  renameLocation: (id: string, label: string) => SaveLocationResult;
  removeLocation: (id: string) => void;
}

const SEED_SAVED_LOCATIONS: SavedLocation[] = [
  {
    id: "stub-home",
    label: "Home",
    location: {
      id: "stub-location-north-sydney",
      displayLabel: "North Sydney, New South Wales, Australia",
      name: "North Sydney",
      regionName: "New South Wales",
      countryName: "Australia",
      latitude: -33.8404,
      longitude: 151.2073,
    },
    createdAt: 0,
  },
  {
    id: "stub-gym",
    label: "Gym",
    location: {
      id: "stub-location-perth",
      displayLabel: "Perth, Western Australia, Australia",
      name: "Perth",
      regionName: "Western Australia",
      countryName: "Australia",
      latitude: -31.9523,
      longitude: 115.8613,
    },
    createdAt: 0,
  },
];

export const useSavedLocationsStore = create<SavedLocationsState>(
  (set, get) => ({
    savedLocations: SEED_SAVED_LOCATIONS,
    hydrate: () => {},
    saveLocation: ({ label, location }) => {
      const id = `stub-${get().savedLocations.length}`;

      set({
        savedLocations: [
          { id, label, location, createdAt: 0 },
          ...get().savedLocations,
        ],
      });

      return { status: "saved", id };
    },
    renameLocation: (id, label) => {
      set({
        savedLocations: get().savedLocations.map((saved) =>
          saved.id === id ? { ...saved, label } : saved,
        ),
      });

      return { status: "saved", id };
    },
    removeLocation: (id) =>
      set({
        savedLocations: get().savedLocations.filter((saved) => saved.id !== id),
      }),
  }),
);
