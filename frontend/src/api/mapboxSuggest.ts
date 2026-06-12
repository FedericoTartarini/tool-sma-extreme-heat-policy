import type { LocationSuggestion } from "@/domain/location";
import { LOCATION_SUGGEST_TYPES } from "@/domain/locationSearch";

const MAPBOX_SUGGEST_ENDPOINT =
  "https://api.mapbox.com/search/searchbox/v1/suggest";

interface MapboxSuggestResponse {
  suggestions?: MapboxSuggestItem[];
}

interface MapboxSuggestItem {
  mapbox_id?: string;
  feature_type?: string;
  name?: string;
  name_preferred?: string;
  context?: unknown;
}

type UnknownRecord = Record<string, unknown>;
const LOCATION_SUGGEST_TYPE_SET = new Set<string>(LOCATION_SUGGEST_TYPES);
const COUNTRY_NAME_FALLBACK_FEATURE_TYPE_SET = new Set<string>([
  "place",
  "city",
]);

export interface MapboxSuggestParams {
  query: string;
  accessToken: string;
  sessionToken: string;
  types?: string;
  signal?: AbortSignal;
  limit?: number;
  language?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toContextEntry(context: unknown, key: string): UnknownRecord | null {
  if (!isRecord(context)) {
    return null;
  }

  const entry = context[key];

  if (Array.isArray(entry)) {
    return entry.find((item) => isRecord(item)) ?? null;
  }

  return isRecord(entry) ? entry : null;
}

function toContextName(context: unknown, key: string): string {
  const entry = toContextEntry(context, key);
  if (!entry) {
    return "";
  }

  return toTrimmedString(entry.name);
}

function toCountryCode(context: unknown): string {
  const countryEntry = toContextEntry(context, "country");
  if (!countryEntry) {
    return "";
  }

  return toTrimmedString(countryEntry.country_code).toUpperCase();
}

function toCountryName(params: {
  context: unknown;
  fallbackName: string;
  featureType: unknown;
}): string {
  const { context, fallbackName, featureType } = params;
  const countryName = toContextName(context, "country");
  if (countryName) {
    return countryName;
  }

  const placeName = toContextName(context, "place");
  if (placeName) {
    return placeName;
  }

  const normalizedFeatureType = toTrimmedString(featureType);
  return COUNTRY_NAME_FALLBACK_FEATURE_TYPE_SET.has(normalizedFeatureType)
    ? fallbackName
    : "";
}

function isSupportedFeatureType(value: unknown): boolean {
  const normalizedValue = toTrimmedString(value);
  return LOCATION_SUGGEST_TYPE_SET.has(normalizedValue);
}

function toDisplayLabel(parts: {
  name: string;
  regionName: string;
  countryName: string;
}): string {
  const { name, regionName, countryName } = parts;
  const visibleParts = [name, regionName, countryName].filter(Boolean);

  return visibleParts.join(", ");
}

function toLocationSuggestion(
  suggestion: MapboxSuggestItem,
  sessionToken: string,
): LocationSuggestion | null {
  const mapboxId = suggestion.mapbox_id;
  const name = toTrimmedString(suggestion.name_preferred ?? suggestion.name);
  const regionName = toContextName(suggestion.context, "region");
  const countryName = toCountryName({
    context: suggestion.context,
    fallbackName: name,
    featureType: suggestion.feature_type,
  });
  const countryCode = toCountryCode(suggestion.context);

  if (
    !mapboxId ||
    !isSupportedFeatureType(suggestion.feature_type) ||
    !name ||
    !countryName
  ) {
    return null;
  }

  const displayLabel = toDisplayLabel({ name, regionName, countryName });

  return {
    id: mapboxId,
    displayLabel,
    name,
    ...(regionName ? { regionName } : {}),
    countryName,
    mapboxId,
    ...(countryCode ? { countryCode } : {}),
    sessionToken,
  };
}

function toSuggestQueryString({
  query,
  accessToken,
  sessionToken,
  types,
  limit,
  language,
}: Required<
  Pick<MapboxSuggestParams, "query" | "accessToken" | "sessionToken">
> &
  Pick<MapboxSuggestParams, "types" | "limit" | "language">): string {
  const params = new URLSearchParams({
    q: query,
    access_token: accessToken,
    session_token: sessionToken,
    limit: String(limit ?? 8),
  });

  if (types) {
    params.set("types", types);
  }

  if (language) {
    params.set("language", language);
  }

  return params.toString();
}

/**
 * Calls Mapbox Search Box `suggest` API and maps supported weather location results.
 */
export async function suggestLocations({
  query,
  accessToken,
  sessionToken,
  types,
  signal,
  limit = 8,
  language,
}: MapboxSuggestParams): Promise<LocationSuggestion[]> {
  const queryString = toSuggestQueryString({
    query,
    accessToken,
    sessionToken,
    types,
    limit,
    language,
  });

  const response = await fetch(`${MAPBOX_SUGGEST_ENDPOINT}?${queryString}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mapbox suggest failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as MapboxSuggestResponse;
  const suggestions = data.suggestions ?? [];
  const mappedSuggestions = suggestions.map((suggestion) =>
    toLocationSuggestion(suggestion, sessionToken),
  );

  return mappedSuggestions.filter(
    (suggestion): suggestion is LocationSuggestion => suggestion !== null,
  );
}
