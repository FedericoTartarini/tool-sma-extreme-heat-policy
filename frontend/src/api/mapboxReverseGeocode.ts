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
const LOCATION_CONTEXT_PRIORITY = [
  "neighborhood",
  "locality",
  "place",
  "city",
] as const;
const COUNTRY_NAME_FALLBACK_TYPE_SET = new Set<string>(["place", "city"]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isMapboxReverseResponse(
  value: unknown,
): value is MapboxReverseResponse {
  return isRecord(value) && Array.isArray(value.features);
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
  return entry ? toTrimmedString(entry.name) : "";
}

function toCountryCode(context: unknown): string {
  const country = toContextEntry(context, "country");
  return country ? toTrimmedString(country.country_code).toUpperCase() : "";
}

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

function toWeatherLocationIdentity(
  properties: MapboxReverseProperties,
): { featureType: string; name: string; idSuffix: string } | null {
  const featureType = toTrimmedString(properties.feature_type);
  const featureName = toTrimmedString(
    properties.name_preferred ?? properties.name,
  );

  if (LOCATION_TYPE_SET.has(featureType) && featureName) {
    return { featureType, name: featureName, idSuffix: "" };
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
        idSuffix: `:${contextType}`,
      };
    }
  }

  return null;
}

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

  const { featureType, name, idSuffix } = weatherLocation;
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
    id: `${mapboxId}${idSuffix}`,
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
