import {
  createMapboxHttpStatusError,
  createMapboxInvalidResponseError,
  toMapboxApiError,
  toMapboxResponseJsonError,
} from "@/api/mapboxErrors";
import type { LocationSuggestion } from "@/domain/location";

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
  language?: string;
  signal?: AbortSignal;
}

/** Prefer a suburb to a town when both have their own searchable identity. */
const LOCATION_CONTEXT_PRIORITY = [
  "neighborhood",
  "locality",
  "place",
  "city",
] as const;

/**
 * Feature types where the top-level feature name itself is an acceptable
 * country-name fallback when no `context.country` is present in the response.
 */
const COUNTRY_NAME_FALLBACK_TYPE_SET = new Set<string>(["place", "city"]);

/**
 * Returns true for arbitrary values that are plain objects (not null/array).
 */
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  mapboxId: string;
}

/**
 * Returns the supported place's own name and ID, never the containing address's
 * ID. Districts, postcodes and regions cannot be restored by our search filter.
 */
function toWeatherLocationIdentity(
  properties: MapboxReverseProperties,
): ResolvedLocationIdentity | null {
  const featureType = toTrimmedString(properties.feature_type);
  const featureName = toTrimmedString(
    properties.name_preferred ?? properties.name,
  );

  for (const contextType of LOCATION_CONTEXT_PRIORITY) {
    const featureId = toTrimmedString(properties.mapbox_id);
    if (featureType === contextType && featureName && featureId) {
      return { featureType, name: featureName, mapboxId: featureId };
    }

    const entry = toContextEntry(properties.context, contextType);
    const contextName = entry
      ? toTrimmedString(entry.name_preferred ?? entry.name)
      : "";

    // Search Box contexts expose `id`; accept `mapbox_id` when supplied too.
    const contextId = entry
      ? toTrimmedString(entry.mapbox_id) || toTrimmedString(entry.id)
      : "";

    if (contextName && contextId) {
      return {
        featureType: contextType,
        name: contextName,
        mapboxId: contextId,
      };
    }
  }

  return null;
}

/**
 * Builds a search-compatible label and identity, retaining device coordinates
 * for the risk calculation rather than substituting the suburb's centre.
 */
function toLocationSuggestion(params: {
  feature: UnknownRecord;
  latitude: number;
  longitude: number;
}): { suggestion: LocationSuggestion; priority: number } | null {
  const { feature, latitude, longitude } = params;
  const properties = isRecord(feature.properties)
    ? (feature.properties as MapboxReverseProperties)
    : null;

  if (!properties) {
    return null;
  }

  const weatherLocation = toWeatherLocationIdentity(properties);
  if (!weatherLocation) {
    return null;
  }

  const { featureType, name, mapboxId } = weatherLocation;
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
    priority: LOCATION_CONTEXT_PRIORITY.findIndex(
      (type) => type === featureType,
    ),
    suggestion: {
      id: mapboxId,
      displayLabel: [name, regionName, countryName].filter(Boolean).join(", "),
      name,
      ...(regionName ? { regionName } : {}),
      countryName,
      mapboxId,
      ...(countryCode ? { countryCode } : {}),
      latitude,
      longitude,
    },
  };
}

/**
 * Serialises the reverse-geocoding request parameters into a query string.
 *
 * Requests nearby places using the caller's language preference.
 */
function toReverseQueryString({
  latitude,
  longitude,
  accessToken,
  language,
}: Required<
  Pick<MapboxReverseGeocodeParams, "latitude" | "longitude" | "accessToken">
> &
  Pick<MapboxReverseGeocodeParams, "language">): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    access_token: accessToken,
    limit: "5",
    types: "locality,place,city",
  });

  if (language) {
    params.set("language", language);
  }

  return params.toString();
}

/**
 * Resolves coordinates to searchable suburbs or towns, in that priority order.
 * If no supported place with its own ID exists, returns an empty array so the
 * caller can direct the user to search manually.
 *
 * @throws MapboxApiError Throws the same structured error family used by
 *   `suggestLocations` so callers can treat both lookup paths uniformly.
 */
export async function reverseGeocodeCoordinates({
  latitude,
  longitude,
  accessToken,
  language,
  signal,
}: MapboxReverseGeocodeParams): Promise<LocationSuggestion[]> {
  const queryString = toReverseQueryString({
    latitude,
    longitude,
    accessToken,
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

  const seenIds = new Set<string>();
  return payload.features
    .filter((feature): feature is UnknownRecord => isRecord(feature))
    .map((feature) => toLocationSuggestion({ feature, latitude, longitude }))
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort((a, b) => a.priority - b.priority)
    .map(({ suggestion }) => suggestion)
    .filter((suggestion) => {
      if (seenIds.has(suggestion.id)) {
        return false;
      }
      seenIds.add(suggestion.id);
      return true;
    });
}
