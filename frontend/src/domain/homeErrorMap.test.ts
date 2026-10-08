import { describe, expect, it } from "vitest";
import {
  toCalculationErrorI18nKey,
  toLocationErrorI18nKey,
  type HomeCalculationErrorReason,
  type HomeLocationErrorReason,
} from "@/domain/homeErrorMap";

describe("homeErrorMap", () => {
  it("maps location error reasons to user-facing copy keys", () => {
    const expected: Record<HomeLocationErrorReason, string> = {
      missing_token: "errors.mapbox.missingToken",
      unavailable: "errors.mapbox.unavailable",
      no_results: "errors.mapbox.noResults",
      retrieve_failed: "errors.mapbox.retrieveFailed",
      reverse_geocode_failed: "errors.mapbox.reverseFailed",
      location_not_resolved: "errors.location.notResolved",
      prefilled_location_not_matched: "errors.location.prefilledNotMatched",
      geolocation_permission_denied: "errors.location.permissionDenied",
      geolocation_unavailable: "errors.location.geolocationUnavailable",
      geolocation_timeout: "errors.location.geolocationTimeout",
    };

    for (const [reason, i18nKey] of Object.entries(expected)) {
      expect(toLocationErrorI18nKey(reason as HomeLocationErrorReason)).toBe(
        i18nKey,
      );
    }
  });

  it("maps heat-risk calculation error reasons to user-facing copy keys", () => {
    const expected: Record<HomeCalculationErrorReason, string> = {
      missing_location_coordinates: "errors.location.missingCoordinates",
      missing_config: "errors.risk.missingApiBaseUrl",
      abort: "errors.risk.network",
      http_status: "errors.risk.network",
      invalid_response: "errors.risk.invalidResponse",
      network: "errors.risk.network",
      weather_provider_unavailable: "errors.risk.weatherProvider",
    };

    for (const [reason, i18nKey] of Object.entries(expected)) {
      expect(
        toCalculationErrorI18nKey(reason as HomeCalculationErrorReason),
      ).toBe(i18nKey);
    }
  });
});
