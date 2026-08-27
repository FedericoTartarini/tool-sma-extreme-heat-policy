import { MAX_SAVED_LOCATIONS, type SavedLocation } from "@/domain/multicity";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import { isValidPersistedSport } from "@/pages/home/browserState";

const MULTICITY_STORAGE_KEY = "multicity-locations:v1";

export interface PersistedMulticityState {
  sport: SportType;
  locations: SavedLocation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSavedLocation(value: unknown): value is SavedLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.displayLabel === "string" &&
    value.displayLabel.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.countryName === "string" &&
    value.countryName.length > 0 &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    (value.regionName === undefined || typeof value.regionName === "string") &&
    (value.mapboxId === undefined || typeof value.mapboxId === "string")
  );
}

/**
 * Loads and validates persisted multi-city dashboard state from localStorage.
 */
export function loadPersistedMulticityState(
  allowedSports: readonly SportType[],
): PersistedMulticityState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MULTICITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const locations = parsed.locations;

    if (!Array.isArray(locations) || !locations.every(isValidSavedLocation)) {
      return null;
    }

    const sport = isValidPersistedSport(parsed.sport, allowedSports)
      ? parsed.sport
      : DEFAULT_SPORT_TYPE;

    return {
      sport,
      locations: locations.slice(0, MAX_SAVED_LOCATIONS),
    };
  } catch {
    return null;
  }
}

/**
 * Persists the latest multi-city dashboard state into localStorage (best-effort).
 */
export function savePersistedMulticityState(
  state: PersistedMulticityState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedMulticityState = {
      sport: state.sport,
      locations: state.locations,
    };

    window.localStorage.setItem(MULTICITY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}

/**
 * Resolves the initial dashboard sport from persisted state or app defaults.
 */
export function resolveInitialMulticitySport(
  persistedState: PersistedMulticityState | null,
): SportType {
  return persistedState?.sport ?? DEFAULT_SPORT_TYPE;
}

/**
 * Resolves the initial saved locations list from persisted state.
 */
export function resolveInitialMulticityLocations(
  persistedState: PersistedMulticityState | null,
): SavedLocation[] {
  return persistedState?.locations ?? [];
}
