export type HomeSuggestErrorReason =
  | "missing_token"
  | "unavailable"
  | "no_results"
  | "retrieve_failed"
  | "prefilled_location_not_matched";

export type HomeCurrentLocationErrorReason =
  | "missing_token"
  | "geolocation_permission_denied"
  | "geolocation_unavailable"
  | "geolocation_timeout"
  | "reverse_geocode_failed";

export type HomeLocationErrorReason =
  | HomeSuggestErrorReason
  | HomeCurrentLocationErrorReason;

export type HomeCalculationErrorReason =
  | "missing_location_coordinates"
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network"
  | "weather_provider_unavailable";

const LOCATION_ERROR_I18N_KEY_BY_REASON: Record<
  HomeLocationErrorReason,
  string
> = {
  missing_token: "errors.mapbox.missingToken",
  retrieve_failed: "errors.mapbox.retrieveFailed",
  reverse_geocode_failed: "errors.mapbox.reverseFailed",
  prefilled_location_not_matched: "errors.location.prefilledNotMatched",
  unavailable: "errors.mapbox.unavailable",
  no_results: "errors.mapbox.noResults",
  geolocation_permission_denied: "errors.location.permissionDenied",
  geolocation_unavailable: "errors.location.geolocationUnavailable",
  geolocation_timeout: "errors.location.geolocationTimeout",
};

const CALCULATION_ERROR_I18N_KEY_BY_REASON: Record<
  HomeCalculationErrorReason,
  string
> = {
  missing_location_coordinates: "errors.location.missingCoordinates",
  missing_config: "errors.risk.missingApiBaseUrl",
  abort: "errors.risk.network",
  http_status: "errors.risk.network",
  invalid_response: "errors.risk.invalidResponse",
  network: "errors.risk.network",
  weather_provider_unavailable: "errors.risk.weatherProvider",
};

/**
 * Maps a location search or current-location error reason to an i18n key.
 */
export function toLocationErrorI18nKey(
  reason: HomeLocationErrorReason | null,
): string | null {
  if (!reason) {
    return null;
  }

  return LOCATION_ERROR_I18N_KEY_BY_REASON[reason] ?? null;
}

/**
 * Maps a heat-risk calculation error reason to an i18n key.
 */
export function toCalculationErrorI18nKey(
  reason: HomeCalculationErrorReason | null,
): string | null {
  if (!reason) {
    return null;
  }

  return CALCULATION_ERROR_I18N_KEY_BY_REASON[reason] ?? null;
}
