import type { LocationSuggestion } from "@/domain/location";

export const MAX_SAVED_LOCATIONS = 6;
export const COORDINATE_KEY_DECIMALS = 6;

export interface SavedLocation {
  id: string;
  displayLabel: string;
  name: string;
  regionName?: string;
  countryName: string;
  latitude: number;
  longitude: number;
  mapboxId?: string;
}

export type AddLocationFailureReason =
  | "duplicate"
  | "max_reached"
  | "missing_coordinates";

export type AddLocationResult =
  | { ok: true }
  | { ok: false; reason: AddLocationFailureReason };

export function toCoordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_KEY_DECIMALS)}|${longitude.toFixed(COORDINATE_KEY_DECIMALS)}`;
}

/**
 * Builds the secondary city label shown beneath the primary city name on cards.
 */
export function formatSavedLocationSubtitle(
  location: Pick<SavedLocation, "name" | "regionName" | "countryName">,
): string {
  return [location.regionName, location.countryName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}

/**
 * Builds the home page URL for a saved dashboard location.
 */
export function buildMulticityHomePath(
  sport: string,
  displayLabel: string,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("sport", sport);
  searchParams.set("loc", displayLabel);

  return `/?${searchParams.toString()}`;
}

/**
 * Returns the first visible character for a mobile city avatar.
 */
export function toSavedLocationAvatarLabel(name: string): string {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "?";
  }

  return trimmedName.charAt(0).toUpperCase();
}

export function canAddSavedLocation(
  locations: readonly SavedLocation[],
): boolean {
  return locations.length < MAX_SAVED_LOCATIONS;
}

/**
 * Returns true when the candidate matches a saved city by mapbox id or coordinates.
 * Mapbox Search Box ids are session-scoped, so equal ids are sufficient but not required.
 */
export function isDuplicateSavedLocation(
  locations: readonly SavedLocation[],
  candidate: Pick<SavedLocation, "latitude" | "longitude" | "mapboxId">,
): boolean {
  const candidateKey = toCoordinateKey(candidate.latitude, candidate.longitude);

  return locations.some((location) => {
    if (
      location.mapboxId &&
      candidate.mapboxId &&
      location.mapboxId === candidate.mapboxId
    ) {
      return true;
    }

    return (
      toCoordinateKey(location.latitude, location.longitude) === candidateKey
    );
  });
}

function createSavedLocationId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `location-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Builds a persisted dashboard location from a resolved Mapbox suggestion.
 */
export function createSavedLocationFromSuggestion(
  suggestion: LocationSuggestion & { latitude: number; longitude: number },
): SavedLocation {
  return {
    id: createSavedLocationId(),
    displayLabel: suggestion.displayLabel,
    name: suggestion.name,
    regionName: suggestion.regionName,
    countryName: suggestion.countryName,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    mapboxId: suggestion.mapboxId,
  };
}

/**
 * Validates whether a resolved suggestion can be appended to the dashboard list.
 */
export function validateAddSavedLocation(
  locations: readonly SavedLocation[],
  suggestion: LocationSuggestion,
): AddLocationResult {
  if (!canAddSavedLocation(locations)) {
    return { ok: false, reason: "max_reached" };
  }

  if (suggestion.latitude === undefined || suggestion.longitude === undefined) {
    return { ok: false, reason: "missing_coordinates" };
  }

  if (
    isDuplicateSavedLocation(locations, {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      mapboxId: suggestion.mapboxId,
    })
  ) {
    return { ok: false, reason: "duplicate" };
  }

  return { ok: true };
}
