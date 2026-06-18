import { ApiError, toApiError, type ApiErrorKind } from "@/api/apiErrors";

export type MapboxEndpoint = "suggest" | "retrieve";

/**
 * Structured Mapbox API error carrying the failed endpoint.
 */
export class MapboxApiError extends ApiError {
  readonly endpoint: MapboxEndpoint;

  constructor(params: {
    endpoint: MapboxEndpoint;
    kind: ApiErrorKind;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(params);
    this.name = "MapboxApiError";
    this.endpoint = params.endpoint;
  }
}

/**
 * Builds a Mapbox API error for non-OK HTTP responses.
 */
export function createMapboxHttpStatusError(
  endpoint: MapboxEndpoint,
  status: number,
): MapboxApiError {
  return new MapboxApiError({
    endpoint,
    kind: "http_status",
    status,
    message: `Mapbox ${endpoint} failed with HTTP ${status}`,
  });
}

/**
 * Builds a Mapbox API error for malformed response payloads.
 */
export function createMapboxInvalidResponseError(
  endpoint: MapboxEndpoint,
  message: string,
  cause?: unknown,
): MapboxApiError {
  return new MapboxApiError({
    endpoint,
    kind: "invalid_response",
    message,
    cause,
  });
}

function hasErrorName(value: unknown, name: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    value.name === name
  );
}

/**
 * Normalizes Mapbox response JSON parsing failures without masking aborts.
 */
export function toMapboxResponseJsonError(
  endpoint: MapboxEndpoint,
  error: unknown,
  message: string,
): MapboxApiError {
  if (hasErrorName(error, "SyntaxError")) {
    return createMapboxInvalidResponseError(endpoint, message, error);
  }

  return toMapboxApiError(endpoint, error);
}

/**
 * Normalizes thrown Mapbox request values into structured Mapbox API errors.
 */
export function toMapboxApiError(
  endpoint: MapboxEndpoint,
  error: unknown,
): MapboxApiError {
  const apiError = toApiError(error, `Mapbox ${endpoint} request failed`);

  return new MapboxApiError({
    endpoint,
    kind: apiError.kind,
    message: apiError.message,
    status: apiError.status,
    cause: apiError.cause,
  });
}
