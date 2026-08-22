import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import {
  createSavedLocation,
  hasCoordinates,
  isDuplicateLabel,
  normalizeLabel,
  SAVED_LOCATIONS_MAX,
  type SavedLocation,
  type SaveLocationResult,
} from "@/domain/savedLocation";
import {
  loadSavedLocations,
  saveSavedLocations,
} from "@/pages/home/savedLocationsStorage";

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

export const useSavedLocationsStore = create<SavedLocationsState>(
  (set, get) => {
    function commit(savedLocations: readonly SavedLocation[]): void {
      set({ savedLocations });
      saveSavedLocations(savedLocations);
    }

    return {
      savedLocations: loadSavedLocations(),
      hydrate: () => set({ savedLocations: loadSavedLocations() }),
      saveLocation: ({ label, location }) => {
        if (!hasCoordinates(location)) {
          return { status: "rejected", reason: "missing_coordinates" };
        }

        const normalizedLabel = normalizeLabel(label);
        if (!normalizedLabel) {
          return { status: "rejected", reason: "empty_label" };
        }

        const { savedLocations } = get();
        if (isDuplicateLabel(savedLocations, normalizedLabel)) {
          return { status: "rejected", reason: "duplicate_label" };
        }

        if (savedLocations.length >= SAVED_LOCATIONS_MAX) {
          return { status: "rejected", reason: "limit_reached" };
        }

        const saved = createSavedLocation({
          label: normalizedLabel,
          location,
        });
        commit([saved, ...savedLocations]);

        return { status: "saved", id: saved.id };
      },
      renameLocation: (id, label) => {
        const normalizedLabel = normalizeLabel(label);
        if (!normalizedLabel) {
          return { status: "rejected", reason: "empty_label" };
        }

        const { savedLocations } = get();
        // The entry being renamed must not clash with itself.
        const otherLocations = savedLocations.filter(
          (saved) => saved.id !== id,
        );
        if (isDuplicateLabel(otherLocations, normalizedLabel)) {
          return { status: "rejected", reason: "duplicate_label" };
        }

        // An unknown id leaves the list untouched.
        commit(
          savedLocations.map((saved) =>
            saved.id === id ? { ...saved, label: normalizedLabel } : saved,
          ),
        );

        return { status: "saved", id };
      },
      removeLocation: (id) =>
        commit(get().savedLocations.filter((saved) => saved.id !== id)),
    };
  },
);
