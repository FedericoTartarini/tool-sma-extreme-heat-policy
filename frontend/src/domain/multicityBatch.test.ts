import { describe, expect, it } from "vitest";
import type { BatchHeatRiskLocationResult } from "@/api/heatRiskBatch";
import type { SavedLocation } from "@/domain/multicity";
import {
  buildMulticityLocationCoordsKey,
  indexBatchResultsByCoordinateKey,
  resolveMulticityCityCardState,
  toMulticityCardErrorI18nKey,
} from "@/domain/multicityBatch";

const SYDNEY_LOCATION: SavedLocation = {
  id: "location-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.847,
  longitude: 151.067,
  mapboxId: "mapbox-sydney",
};

const MELBOURNE_LOCATION: SavedLocation = {
  id: "location-melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  latitude: -37.813,
  longitude: 144.963,
  mapboxId: "mapbox-melbourne",
};

const OK_SYDNEY_RESULT: BatchHeatRiskLocationResult = {
  latitude: -33.847,
  longitude: 151.067,
  timezone: "Australia/Sydney",
  status: "ok",
  current_risk_level_interpolated: 1.94,
  today_max_risk_level_interpolated: 2.14,
  current_time_local: "2026-03-09T11:00:00+11:00",
  error_code: null,
  detail: null,
};

const ERROR_MELBOURNE_RESULT: BatchHeatRiskLocationResult = {
  latitude: -37.813,
  longitude: 144.963,
  timezone: null,
  status: "error",
  current_risk_level_interpolated: null,
  today_max_risk_level_interpolated: null,
  current_time_local: null,
  error_code: "weather_provider_unavailable",
  detail: "Weather provider unavailable",
};

describe("multicityBatch domain", () => {
  it("builds a stable coordinate key for batch requests", () => {
    expect(
      buildMulticityLocationCoordsKey([SYDNEY_LOCATION, MELBOURNE_LOCATION]),
    ).toBe("-33.847000|151.067000;-37.813000|144.963000");
  });

  it("ignores saved location order when building the coordinate key", () => {
    expect(
      buildMulticityLocationCoordsKey([MELBOURNE_LOCATION, SYDNEY_LOCATION]),
    ).toBe(
      buildMulticityLocationCoordsKey([SYDNEY_LOCATION, MELBOURNE_LOCATION]),
    );
  });

  it("indexes batch results by normalized coordinates", () => {
    const indexedResults = indexBatchResultsByCoordinateKey([
      OK_SYDNEY_RESULT,
      ERROR_MELBOURNE_RESULT,
    ]);

    expect(indexedResults.get("-33.847000|151.067000")?.status).toBe("ok");
    expect(indexedResults.get("-37.813000|144.963000")?.error_code).toBe(
      "weather_provider_unavailable",
    );
  });

  it("resolves per-card states for success, error, and missing results", () => {
    const indexedResults = indexBatchResultsByCoordinateKey([
      OK_SYDNEY_RESULT,
      ERROR_MELBOURNE_RESULT,
    ]);

    expect(
      resolveMulticityCityCardState(SYDNEY_LOCATION, indexedResults),
    ).toEqual({
      status: "ok",
      currentRiskLevel: "low",
      todayMaxRiskLevel: "moderate",
    });

    expect(
      resolveMulticityCityCardState(MELBOURNE_LOCATION, indexedResults),
    ).toEqual({
      status: "location_error",
      errorCode: "weather_provider_unavailable",
      detail: "Weather provider unavailable",
    });

    expect(
      resolveMulticityCityCardState(
        { ...SYDNEY_LOCATION, latitude: 1, longitude: 2 },
        indexedResults,
      ),
    ).toEqual({
      status: "missing_result",
    });
  });

  it("treats a missing location as loading while a batch fetch is in flight", () => {
    const indexedResults = indexBatchResultsByCoordinateKey([OK_SYDNEY_RESULT]);

    expect(
      resolveMulticityCityCardState(MELBOURNE_LOCATION, indexedResults, {
        isFetching: true,
      }),
    ).toEqual({
      status: "loading",
    });

    expect(
      resolveMulticityCityCardState(MELBOURNE_LOCATION, indexedResults, {
        isFetching: false,
      }),
    ).toEqual({
      status: "missing_result",
    });
  });

  it("maps known card error codes to i18n keys", () => {
    expect(toMulticityCardErrorI18nKey("weather_provider_unavailable")).toBe(
      "errors.risk.weatherProvider",
    );
    expect(toMulticityCardErrorI18nKey("unknown_inputs")).toBe(
      "multicity.cardErrors.unknownInputs",
    );
    expect(toMulticityCardErrorI18nKey("custom_error")).toBe(
      "multicity.cardErrors.generic",
    );
  });
});
