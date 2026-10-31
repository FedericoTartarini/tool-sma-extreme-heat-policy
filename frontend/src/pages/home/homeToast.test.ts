import { describe, expect, it } from "vitest";
import {
  createCalculationErrorToast,
  createForecastUpdatedToast,
  createLocationErrorToast,
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
    expect(createLocationErrorToast(9, "retrieve_failed")).toEqual({
      id: 9,
      i18nKey: "errors.mapbox.retrieveFailed",
      variant: "error",
      durationMs: HOME_ERROR_TOAST_DURATION_MS,
    });
  });

  it("creates a longer error toast for denied location permission", () => {
    expect(
      createLocationErrorToast(10, "geolocation_permission_denied"),
    ).toEqual({
      id: 10,
      i18nKey: "errors.location.permissionDenied",
      variant: "error",
      durationMs: HOME_ERROR_TOAST_DURATION_MS,
    });
  });

  it("does not create a toast without an error reason", () => {
    expect(createCalculationErrorToast(11, null)).toBeNull();
    expect(createLocationErrorToast(12, null)).toBeNull();
  });
});
