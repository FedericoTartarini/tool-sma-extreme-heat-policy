import type { LocationSuggestion } from "@/domain/location";

export const LOCATION_SUGGEST_TYPES = [
  "neighborhood",
  "locality",
  "place",
  "city",
] as const;
export const LOCATION_SUGGEST_TYPES_PARAM = LOCATION_SUGGEST_TYPES.join(",");
export const MIN_LOCATION_QUERY_LENGTH = 2;
export const LOCATION_SUGGEST_DEBOUNCE_MS = 800;
const DEFAULT_VISIBLE_SUGGESTION_LIMIT = 3;

export interface PreparedLocationSuggestions {
  dedupedSuggestions: LocationSuggestion[];
  visibleSuggestions: LocationSuggestion[];
}

export type LocationPrefillSource = "url" | "persisted" | "default" | "none";

function isRestoredPrefillSource(
  prefillSource: LocationPrefillSource,
): boolean {
  return prefillSource === "url" || prefillSource === "persisted";
}

function toLocationLabelParts(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function toLocationIdentityKey(suggestion: LocationSuggestion): string {
  return [suggestion.name, suggestion.regionName ?? "", suggestion.countryName]
    .map(normalizeLocationSearchText)
    .join("|");
}

function dedupeLocationSuggestions(
  suggestions: LocationSuggestion[],
): LocationSuggestion[] {
  const seenKeys = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = toLocationIdentityKey(suggestion);
    if (!key || seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

export function normalizeLocationSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

export function prepareLocationSuggestions(params: {
  suggestions: LocationSuggestion[];
  visibleLimit?: number;
}): PreparedLocationSuggestions {
  const { suggestions, visibleLimit = DEFAULT_VISIBLE_SUGGESTION_LIMIT } =
    params;
  const dedupedSuggestions = dedupeLocationSuggestions(suggestions);

  return {
    dedupedSuggestions,
    visibleSuggestions: dedupedSuggestions.slice(0, visibleLimit),
  };
}

export function findExactNormalizedSuggestion(
  suggestions: LocationSuggestion[],
  value: string,
): LocationSuggestion | null {
  const normalizedValue = normalizeLocationSearchText(value);
  if (!normalizedValue) {
    return null;
  }

  return (
    suggestions.find(
      (suggestion) =>
        normalizeLocationSearchText(suggestion.displayLabel) ===
        normalizedValue,
    ) ?? null
  );
}

export function toPrefilledLocationSuggestQuery(value: string): string {
  const trimmedValue = value.trim();
  const parts = toLocationLabelParts(trimmedValue);

  if (
    parts.length === 2 &&
    normalizeLocationSearchText(parts[0]) ===
      normalizeLocationSearchText(parts[1])
  ) {
    return parts[0];
  }

  return trimmedValue;
}

export function resolvePrefilledLocationSuggestion(params: {
  suggestions: LocationSuggestion[];
  value: string;
  prefillSource: LocationPrefillSource;
}): LocationSuggestion | null {
  const { suggestions, value, prefillSource } = params;
  const exactSuggestion = findExactNormalizedSuggestion(suggestions, value);

  if (exactSuggestion) {
    return exactSuggestion;
  }

  const suggestQuery = isRestoredPrefillSource(prefillSource)
    ? toPrefilledLocationSuggestQuery(value)
    : "";
  const shouldTrySuggestQuery =
    suggestQuery.length > 0 &&
    normalizeLocationSearchText(suggestQuery) !==
      normalizeLocationSearchText(value);

  if (shouldTrySuggestQuery) {
    const suggestQueryMatch = findExactNormalizedSuggestion(
      suggestions,
      suggestQuery,
    );

    if (suggestQueryMatch) {
      return suggestQueryMatch;
    }
  }

  return prefillSource === "default" ? (suggestions[0] ?? null) : null;
}

/**
 * Determines whether unmatched URL/storage prefill values should reveal manual choices.
 */
export function shouldOpenPrefilledLocationDropdown(params: {
  suggestions: LocationSuggestion[];
  visibleSuggestions: LocationSuggestion[];
  value: string;
  prefillSource: LocationPrefillSource;
  isSuggestSuccess: boolean;
}): boolean {
  const {
    suggestions,
    visibleSuggestions,
    value,
    prefillSource,
    isSuggestSuccess,
  } = params;

  if (
    !isSuggestSuccess ||
    visibleSuggestions.length === 0 ||
    (prefillSource !== "url" && prefillSource !== "persisted")
  ) {
    return false;
  }

  return findExactNormalizedSuggestion(suggestions, value) === null;
}

/**
 * Returns the browser's language list for Mapbox suggest requests.
 */
export function getLocationLanguagePreference(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages.join(",");
  }

  return navigator.language || undefined;
}

export function findLocationSuggestionById(
  suggestions: readonly LocationSuggestion[],
  suggestionId: string,
): LocationSuggestion | null {
  return (
    suggestions.find((suggestion) => suggestion.id === suggestionId) ?? null
  );
}

/**
 * A Mapbox session ends when a place is picked, so editing away from the
 * picked label starts a new search session.
 */
export function isStartingNewLocationSearch(params: {
  previousInput: string;
  nextInput: string;
  selectedLabel: string | null;
}): boolean {
  const { previousInput, nextInput, selectedLabel } = params;

  return (
    selectedLabel !== null &&
    previousInput === selectedLabel &&
    nextInput !== selectedLabel
  );
}
