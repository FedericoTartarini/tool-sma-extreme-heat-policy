const MAPBOX_RETRIEVE_ENDPOINT =
  "https://api.mapbox.com/search/searchbox/v1/retrieve";

interface UnknownRecord {
  [key: string]: unknown;
}

interface MapboxRetrieveResponse {
  features?: unknown[];
}

export interface MapboxRetrieveParams {
  mapboxId: string;
  accessToken: string;
  sessionToken: string;
  signal?: AbortSignal;
}

export interface RetrievedCoordinates {
  latitude: number;
  longitude: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toCoordinates(payload: MapboxRetrieveResponse): RetrievedCoordinates {
  if (!Array.isArray(payload.features) || payload.features.length === 0) {
    throw new Error("Mapbox retrieve response did not include features");
  }

  const firstFeature = payload.features[0];
  if (!isRecord(firstFeature)) {
    throw new Error("Mapbox retrieve response feature format was invalid");
  }

  const geometry = firstFeature.geometry;
  if (!isRecord(geometry)) {
    throw new Error("Mapbox retrieve response geometry was missing");
  }

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error("Mapbox retrieve response coordinates were missing");
  }

  const longitude = toFiniteNumberOrNull(coordinates[0]);
  const latitude = toFiniteNumberOrNull(coordinates[1]);
  if (longitude === null || latitude === null) {
    throw new Error("Mapbox retrieve coordinates were invalid");
  }

  return { latitude, longitude };
}

/**
 * Calls Mapbox Search Box `retrieve` API and extracts coordinates.
 */
export async function retrieveLocationCoordinates({
  mapboxId,
  accessToken,
  sessionToken,
  signal,
}: MapboxRetrieveParams): Promise<RetrievedCoordinates> {
  const path = encodeURIComponent(mapboxId);
  const params = new URLSearchParams({
    access_token: accessToken,
    session_token: sessionToken,
  });

  const response = await fetch(
    `${MAPBOX_RETRIEVE_ENDPOINT}/${path}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Mapbox retrieve failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as MapboxRetrieveResponse;
  return toCoordinates(payload);
}
