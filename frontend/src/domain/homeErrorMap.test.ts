import { describe, expect, it } from "vitest";
import {
  toCalculationErrorI18nKey,
  toSuggestErrorI18nKey,
  type HomeCalculationErrorReason,
  type HomeSuggestErrorReason,
} from "@/domain/homeErrorMap";

describe("homeErrorMap", () => {
  it("maps location suggest error reasons to user-facing copy keys", () => {
    const expected: Record<HomeSuggestErrorReason, string> = {
      missing_token: "errors.mapbox.missingToken",
      unavailable: "errors.mapbox.unavailable",
      no_results: "errors.mapbox.noResults",
      retrieve_failed: "errors.mapbox.retrieveFailed",
      prefilled_location_not_matched: "errors.location.prefilledNotMatched",
    };

    for (const [reason, i18nKey] of Object.entries(expected)) {
      expect(toSuggestErrorI18nKey(reason as HomeSuggestErrorReason)).toBe(
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
