export type HomeSuggestErrorReason =
  | "missing_token"
  | "unavailable"
  | "no_results"
  | "retrieve_failed"
  | "prefilled_location_not_matched";

export type HomeCalculationErrorReason =
  | "missing_location_coordinates"
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network";

const SUGGEST_ERROR_I18N_KEY_BY_REASON: Record<HomeSuggestErrorReason, string> =
  {
    missing_token: "errors.mapbox.missingToken",
    retrieve_failed: "errors.mapbox.retrieveFailed",
    prefilled_location_not_matched: "errors.location.prefilledNotMatched",
    unavailable: "errors.mapbox.unavailable",
    no_results: "errors.mapbox.noResults",
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
};

/**
 * Maps a location suggest error reason to an i18n key.
 */
export function toSuggestErrorI18nKey(
  reason: HomeSuggestErrorReason | null,
): string | null {
  if (!reason) {
    return null;
  }

  return SUGGEST_ERROR_I18N_KEY_BY_REASON[reason] ?? null;
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
