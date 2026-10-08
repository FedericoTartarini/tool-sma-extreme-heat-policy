import {
  createMapboxHttpStatusError,
  createMapboxInvalidResponseError,
  toMapboxApiError,
  toMapboxResponseJsonError,
} from "@/api/mapboxErrors";
import type { LocationSuggestion } from "@/domain/location";
import {
  LOCATION_SUGGEST_TYPES,
  LOCATION_SUGGEST_TYPES_PARAM,
} from "@/domain/locationSearch";

const MAPBOX_REVERSE_ENDPOINT =
  "https://api.mapbox.com/search/searchbox/v1/reverse";

type UnknownRecord = Record<string, unknown>;

interface MapboxReverseResponse {
  features: unknown[];
}

interface MapboxReverseProperties {
  mapbox_id?: unknown;
  feature_type?: unknown;
  name?: unknown;
  name_preferred?: unknown;
  context?: unknown;
}

export interface MapboxReverseGeocodeParams {
  latitude: number;
  longitude: number;
  accessToken: string;
  types?: string;
  limit?: number;
  language?: string;
  signal?: AbortSignal;
}

const LOCATION_TYPE_SET = new Set<string>(LOCATION_SUGGEST_TYPES);

/**
 * Hierarchical order in which we look for a supported weather-location identity.
 *
 * The Search Box reverse endpoint frequently returns an `address` or `street`
 * top-level feature even with a `neighborhood,locality,place,city` filter. The
 * first pass prefers those primary types. If none is present (rural areas,
 * Singapore, some overseas regions) we fall back to broader administrative
 * levels so the user still lands on the nearest recognisable town/district.
 */
const LOCATION_CONTEXT_PRIORITY = [
  "neighborhood",
  "locality",
  "place",
  "city",
] as const;

/**
 * Secondary administrative tiers used only when the primary tiers above are
 * absent. Values here do not appear in the search suggest endpoint, but they
 * let us derive a usable fallback result for rural and overseas coordinates.
 */
const FALLBACK_CONTEXT_PRIORITY = ["district", "postcode", "region"] as const;

/**
 * Feature types where the top-level feature name itself is an acceptable
 * country-name fallback when no `context.country` is present in the response.
 */
const COUNTRY_NAME_FALLBACK_TYPE_SET = new Set<string>(["place", "city"]);

/**
 * Returns true for arbitrary values that are plain objects (not null/array).
 */
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard for the Search Box reverse JSON payload envelope.
 */
function isMapboxReverseResponse(
  value: unknown,
): value is MapboxReverseResponse {
  return isRecord(value) && Array.isArray(value.features);
}

/**
 * Trims a string-like value, returning "" for anything that isn't a string.
 */
function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads a single keyed entry out of a Search Box `context` record.
 *
 * Context values can be either an object (`{ name, ... }`) or an array of such
 * objects (for example `regions` in some responses). The array variant is
 * handled by picking the first object-shaped entry.
 */
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

/**
 * Convenience wrapper that reads the `name` property of a context entry.
 */
function toContextName(context: unknown, key: string): string {
  const entry = toContextEntry(context, key);
  return entry ? toTrimmedString(entry.name) : "";
}

/**
 * Reads an ISO-3166 alpha-2 country code from a response context, uppercased.
 */
function toCountryCode(context: unknown): string {
  const country = toContextEntry(context, "country");
  return country ? toTrimmedString(country.country_code).toUpperCase() : "";
}

/**
 * Builds the country field shown in the human-readable display label.
 *
 * Normally this is `context.country.name`. For `place` and `city` tiers the
 * existing search-suggest helper also falls back to the place name itself when
 * the country layer is missing, so we mirror that behaviour to keep labels
 * consistent across both code paths.
 */
function toCountryName(params: {
  context: unknown;
  fallbackName: string;
  featureType: string;
}): string {
  const { context, fallbackName, featureType } = params;
  const countryName = toContextName(context, "country");
  if (countryName) {
    return countryName;
  }

  const placeName = toContextName(context, "place");
  if (
    placeName &&
    (placeName === fallbackName ||
      COUNTRY_NAME_FALLBACK_TYPE_SET.has(featureType))
  ) {
    return placeName;
  }

  return COUNTRY_NAME_FALLBACK_TYPE_SET.has(featureType) ? fallbackName : "";
}

interface ResolvedLocationIdentity {
  featureType: string;
  name: string;
}

/**
 * Resolves a reverse-geocoded feature into a weather-ready location identity.
 *
 * The strategy is:
 * 1. Accept the top-level feature if its `feature_type` is one of the
 *    supported weather tiers (neighborhood / locality / place / city).
 * 2. Otherwise walk `context` in priority order and pick the first supported
 *    entry.
 * 3. If nothing was found, walk a secondary fallback list (district / postcode
 *    / region) so rural coordinates, overseas cities and lightly-mapped areas
 *    still yield a result the user can recognise.
 *
 * The returned identity deliberately carries no id-suffix because suggestion
 * identity should be driven by the stable `mapbox_id` of the feature that
 * supplied the final location, matching what the search/suggest path produces.
 */
function toWeatherLocationIdentity(
  properties: MapboxReverseProperties,
): ResolvedLocationIdentity | null {
  const featureType = toTrimmedString(properties.feature_type);
  const featureName = toTrimmedString(
    properties.name_preferred ?? properties.name,
  );

  if (LOCATION_TYPE_SET.has(featureType) && featureName) {
    return { featureType, name: featureName };
  }

  for (const contextType of LOCATION_CONTEXT_PRIORITY) {
    const entry = toContextEntry(properties.context, contextType);
    const contextName = entry
      ? toTrimmedString(entry.name_preferred ?? entry.name)
      : "";

    if (contextName) {
      return {
        featureType: contextType,
        name: contextName,
      };
    }
  }

  for (const fallbackType of FALLBACK_CONTEXT_PRIORITY) {
    const entry = toContextEntry(properties.context, fallbackType);
    const fallbackName = entry
      ? toTrimmedString(entry.name_preferred ?? entry.name)
      : "";

    if (fallbackName) {
      return {
        featureType: fallbackType,
        name: fallbackName,
      };
    }
  }

  return null;
}

/**
 * Constructs a `LocationSuggestion` from a Search Box reverse feature plus
 * the raw coordinates that produced it.
 *
 * The returned suggestion is deliberately shaped to match the output of the
 * existing `mapboxSuggest.ts` path so:
 * - `id` === `mapboxId` (no suffix appended, unlike an earlier draft that
 *   tagged `:locality` / `:place` etc, which broke same-place detection
 *   between detected results and saved/search results).
 * - `displayLabel` is assembled from the same `name, region, country` parts
 *   the search suggest path uses (see `toDisplayLabel` in mapboxSuggest.ts).
 */
function toLocationSuggestion(params: {
  feature: UnknownRecord;
  latitude: number;
  longitude: number;
}): LocationSuggestion | null {
  const { feature, latitude, longitude } = params;
  const properties = isRecord(feature.properties)
    ? (feature.properties as MapboxReverseProperties)
    : null;

  if (!properties) {
    return null;
  }

  const mapboxId = toTrimmedString(properties.mapbox_id);
  const weatherLocation = toWeatherLocationIdentity(properties);
  if (!mapboxId || !weatherLocation) {
    return null;
  }

  const { featureType, name } = weatherLocation;
  const regionName = toContextName(properties.context, "region");
  const countryName = toCountryName({
    context: properties.context,
    fallbackName: name,
    featureType,
  });
  const countryCode = toCountryCode(properties.context);

  if (!countryName) {
    return null;
  }

  return {
    id: mapboxId,
    displayLabel: [name, regionName, countryName].filter(Boolean).join(", "),
    name,
    ...(regionName ? { regionName } : {}),
    countryName,
    mapboxId,
    ...(countryCode ? { countryCode } : {}),
    latitude,
    longitude,
  };
}

/**
 * Serialises the reverse-geocoding request parameters into a query string.
 *
 * Defaults mirror `suggestLocations` so results are presented with the same
 * type filter and language the user already sees in the combobox.
 */
function toReverseQueryString({
  latitude,
  longitude,
  accessToken,
  types,
  limit,
  language,
}: Required<
  Pick<MapboxReverseGeocodeParams, "latitude" | "longitude" | "accessToken">
> &
  Pick<MapboxReverseGeocodeParams, "types" | "limit" | "language">): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    access_token: accessToken,
    limit: String(limit ?? 5),
    types: types ?? LOCATION_SUGGEST_TYPES_PARAM,
  });

  if (language) {
    params.set("language", language);
  }

  return params.toString();
}

/**
 * Reverse-geocodes coordinates into supported weather-location suggestions.
 *
 * Uses the Mapbox Search Box `reverse` endpoint and converts each returned
 * feature into the same `LocationSuggestion` shape used by the text-search
 * path (suggest + retrieve). This ensures saved-location identity, risk
 * calculation, URL serialisation and UI labels behave identically whether
 * the user picked their current location or typed a suburb into the box.
 *
 * Results are best-effort: if no supported neighborhood/locality/place/city
 * tier is present the implementation falls back to broader administrative
 * tiers (district / postcode / region) so rural sports grounds and lightly
 * mapped overseas regions still resolve to something recognisable. When
 * nothing meaningful is available the returned array is empty and the caller
 * should surface the `location_not_resolved` error directing the user to
 * search manually instead of retrying.
 *
 * @throws MapboxApiError Throws the same structured error family used by
 *   `suggestLocations` so callers can treat both lookup paths uniformly.
 */
export async function reverseGeocodeCoordinates({
  latitude,
  longitude,
  accessToken,
  types,
  limit = 5,
  language,
  signal,
}: MapboxReverseGeocodeParams): Promise<LocationSuggestion[]> {
  const queryString = toReverseQueryString({
    latitude,
    longitude,
    accessToken,
    types,
    limit,
    language,
  });

  let response: Response;
  try {
    response = await fetch(`${MAPBOX_REVERSE_ENDPOINT}?${queryString}`, {
      signal,
    });
  } catch (error) {
    throw toMapboxApiError("reverse", error);
  }

  if (!response.ok) {
    throw createMapboxHttpStatusError("reverse", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw toMapboxResponseJsonError(
      "reverse",
      error,
      "Mapbox reverse response was not valid JSON",
    );
  }

  if (!isMapboxReverseResponse(payload)) {
    throw createMapboxInvalidResponseError(
      "reverse",
      "Mapbox reverse response shape was invalid",
    );
  }

  return payload.features
    .filter((feature): feature is UnknownRecord => isRecord(feature))
    .map((feature) => toLocationSuggestion({ feature, latitude, longitude }))
    .filter(
      (suggestion): suggestion is LocationSuggestion => suggestion !== null,
    );
}
