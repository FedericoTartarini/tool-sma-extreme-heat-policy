import { describe, expect, it } from "vitest";
import {
  createCalculationErrorToast,
  createForecastUpdatedToast,
  createSuggestErrorToast,
  HOME_ERROR_TOAST_DURATION_MS,
  HOME_SUCCESS_TOAST_DURATION_MS,
} from "@/pages/home/homeToast";

describe("homeToast", () => {
  it("creates a short success toast for refreshed forecasts", () => {
    expect(createForecastUpdatedToast(7)).toEqual({
      id: 7,
      i18nKey: "home.notifications.forecastUpdated",
      variant: "success",
      durationMs: HOME_SUCCESS_TOAST_DURATION_MS,
    });
  });

  it("creates a longer error toast for weather provider failures", () => {
    expect(
      createCalculationErrorToast(8, "weather_provider_unavailable"),
    ).toEqual({
      id: 8,
      i18nKey: "errors.risk.weatherProvider",
      variant: "error",
      durationMs: HOME_ERROR_TOAST_DURATION_MS,
    });
  });

  it("creates a longer error toast for location retrieve failures", () => {
    expect(createSuggestErrorToast(9, "retrieve_failed")).toEqual({
      id: 9,
      i18nKey: "errors.mapbox.retrieveFailed",
      variant: "error",
      durationMs: HOME_ERROR_TOAST_DURATION_MS,
    });
  });

  it("does not create a toast without an error reason", () => {
    expect(createCalculationErrorToast(10, null)).toBeNull();
    expect(createSuggestErrorToast(11, null)).toBeNull();
  });
});
