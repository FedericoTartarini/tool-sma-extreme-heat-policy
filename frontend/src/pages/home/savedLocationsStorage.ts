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
 * Loads persisted saved locations. Any malformed payload yields an empty list;
 * this never throws.
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
    if (!Array.isArray(parsed) || !parsed.every(isSavedLocation)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

/**
 * Persists saved locations (best-effort).
 */
export function saveSavedLocations(list: readonly SavedLocation[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify(list),
    );
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}
