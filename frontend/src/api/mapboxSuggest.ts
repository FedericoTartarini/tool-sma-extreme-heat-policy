import type { LocationSuggestion } from "@/domain/location";

const MAPBOX_SUGGEST_ENDPOINT =
  "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_TYPES =
  "address,street,neighborhood,locality,place,district,region,postcode,country,poi";

interface MapboxSuggestResponse {
  suggestions?: MapboxSuggestItem[];
}

interface MapboxSuggestItem {
  id?: string;
  mapbox_id?: string;
  full_address?: string;
  place_formatted?: string;
  name?: string;
  name_preferred?: string;
  context?: unknown;
}

type UnknownRecord = Record<string, unknown>;

export interface MapboxSuggestParams {
  query: string;
  accessToken: string;
  sessionToken: string;
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
    const firstObjectEntry = entry.find((item) => isRecord(item));
    return firstObjectEntry ?? null;
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

function toCountry(context: unknown): string {
  const countryEntry = toContextEntry(context, "country");
  if (!countryEntry) {
    return "";
  }

  const rawCountryCode = countryEntry.country_code;
  const countryCode = toTrimmedString(rawCountryCode);
  if (countryCode) {
    return countryCode.toUpperCase();
  }

  return toTrimmedString(countryEntry.name);
}

function toLabel(suggestion: MapboxSuggestItem): string {
  const primary =
    suggestion.name_preferred ??
    suggestion.name ??
    suggestion.full_address ??
    suggestion.place_formatted ??
    suggestion.mapbox_id ??
    suggestion.id ??
    "";

  const secondary = suggestion.place_formatted ?? suggestion.full_address ?? "";

  if (!primary) {
    return "";
  }

  if (!secondary || secondary === primary) {
    return primary;
  }

  return `${primary}, ${secondary}`;
}

function toFormattedLocation(
  suggestion: MapboxSuggestItem,
  fallbackLabel: string,
): string {
  const name = toTrimmedString(suggestion.name_preferred ?? suggestion.name);
  const locality = toContextName(suggestion.context, "locality");
  const place = toContextName(suggestion.context, "place");
  const postcode = toContextName(suggestion.context, "postcode");
  const country = toCountry(suggestion.context);

  const parts = [name, locality, place, postcode, country];
  const formattedParts: string[] = [];

  for (const part of parts) {
    const normalizedPart = part.trim();

    if (!normalizedPart || formattedParts.includes(normalizedPart)) {
      continue;
    }

    formattedParts.push(normalizedPart);
  }

  if (formattedParts.length === 0) {
    return fallbackLabel;
  }

  return formattedParts.join(", ");
}

function toLocationSuggestion(
  suggestion: MapboxSuggestItem,
  sessionToken: string,
  index: number,
): LocationSuggestion | null {
  const label = toLabel(suggestion).trim();
  if (!label) {
    return null;
  }

  const formattedLocation = toFormattedLocation(suggestion, label);
  const mapboxId = suggestion.mapbox_id ?? suggestion.id;
  const id = mapboxId ?? `${label}-${index}`;

  return {
    id,
    label,
    formattedLocation,
    source: "mapbox",
    mapboxId,
    sessionToken,
  };
}

function toSuggestQueryString({
  query,
  accessToken,
  sessionToken,
  limit,
  language,
}: Required<
  Pick<MapboxSuggestParams, "query" | "accessToken" | "sessionToken">
> &
  Pick<MapboxSuggestParams, "limit" | "language">): string {
  const params = new URLSearchParams({
    q: query,
    access_token: accessToken,
    session_token: sessionToken,
    types: MAPBOX_TYPES,
    limit: String(limit ?? 8),
  });

  if (language) {
    params.set("language", language);
  }

  return params.toString();
}

/**
 * Calls Mapbox Search Box `suggest` API and maps results into app location suggestions.
 */
export async function suggestLocations({
  query,
  accessToken,
  sessionToken,
  signal,
  limit = 8,
  language,
}: MapboxSuggestParams): Promise<LocationSuggestion[]> {
  const queryString = toSuggestQueryString({
    query,
    accessToken,
    sessionToken,
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
  const mappedSuggestions: Array<LocationSuggestion | null> = suggestions.map(
    (suggestion, index) =>
      toLocationSuggestion(suggestion, sessionToken, index),
  );

  return mappedSuggestions.filter(
    (suggestion): suggestion is LocationSuggestion => suggestion !== null,
  );
}
