import type { LocationSuggestion } from "@/domain/location";
import { hasCoordinates, type SavedLocation } from "@/domain/savedLocation";

const SAVED_LOCATIONS_STORAGE_KEY = "saved-locations:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocationSuggestion(value: unknown): value is LocationSuggestion {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.displayLabel === "string" &&
    typeof value.name === "string" &&
    typeof value.countryName === "string"
  );
}

/**
 *  A persisted entry without coordinates cannot be applied directly,
 * so it is treated as corrupt rather than kept around.
 */
function isSavedLocation(value: unknown): value is SavedLocation {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    typeof value.createdAt !== "number"
  ) {
    return false;
  }

  return isLocationSuggestion(value.location) && hasCoordinates(value.location);
}

/**
 * Loads persisted saved locations. A non-array or unreadable payload yields
 * an empty list; invalid entries are dropped individually. This never throws.
 */
export function loadSavedLocations(): SavedLocation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_LOCATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn(
        "Saved locations payload is not an array; ignoring it.",
        parsed,
      );
      return [];
    }

    const savedLocations = parsed.filter(isSavedLocation);
    const discardedCount = parsed.length - savedLocations.length;
    if (discardedCount > 0) {
      console.warn(
        `Dropped ${discardedCount} invalid saved-location ${
          discardedCount === 1 ? "entry" : "entries"
        }.`,
      );
    }

    return savedLocations;
  } catch (error) {
    console.warn("Failed to load saved locations from localStorage.", error);
    return [];
  }
}

/**
 * Persists saved locations. Returns false when storage is missing or the
 * write fails; this never throws.
 */
export function saveSavedLocations(list: readonly SavedLocation[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify(list),
    );
    return true;
  } catch (error) {
    console.warn("Failed to persist saved locations to localStorage.", error);
    return false;
  }
}
