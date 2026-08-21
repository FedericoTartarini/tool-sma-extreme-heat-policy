import type { LocationSuggestion } from "@/domain/location";

export const SAVED_LOCATIONS_MAX = 8;
export const SAVED_LOCATION_LABEL_MAX_LENGTH = 20;

export interface SavedLocation {
  id: string;
  label: string;
  /** Full snapshot including coordinates, so applying it needs no Mapbox call. */
  location: LocationSuggestion;
  createdAt: number;
}

/** Machine-readable codes. The UI maps these to i18n keys; never put copy here. */
export type SaveLocationRejectReason =
  | "empty_label"
  | "duplicate_label"
  | "limit_reached"
  | "missing_coordinates";

export type SaveLocationResult =
  | { status: "saved"; id: string }
  | { status: "rejected"; reason: SaveLocationRejectReason };

/** Trims and caps a user-typed label; the input field caps length as well. */
export function normalizeLabel(rawLabel: string): string {
  return rawLabel.trim().slice(0, SAVED_LOCATION_LABEL_MAX_LENGTH);
}

/** Labels collide case-insensitively, so "home" and " Home " are duplicates. */
export function isDuplicateLabel(
  savedLocations: readonly SavedLocation[],
  label: string,
): boolean {
  const comparableLabel = normalizeLabel(label).toLowerCase();

  return savedLocations.some(
    (saved) => saved.label.toLowerCase() === comparableLabel,
  );
}

/** A snapshot without coordinates cannot be applied without a Mapbox lookup. */
export function hasCoordinates(location: LocationSuggestion): boolean {
  return (
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
  );
}

/** Mapbox session tokens expire, so they must not be persisted. */
export function stripSessionToken(
  location: LocationSuggestion,
): LocationSuggestion {
  const persistableLocation = { ...location };
  delete persistableLocation.sessionToken;

  return persistableLocation;
}

export function createSavedLocation(input: {
  label: string;
  location: LocationSuggestion;
}): SavedLocation {
  return {
    id: crypto.randomUUID(),
    label: normalizeLabel(input.label),
    location: stripSessionToken(input.location),
    createdAt: Date.now(),
  };
}
