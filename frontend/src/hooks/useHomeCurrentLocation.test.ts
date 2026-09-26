import { describe, expect, it } from "vitest";
import { toCurrentLocationErrorReason } from "@/hooks/useHomeCurrentLocation";

function createGeolocationError(code: number): GeolocationPositionError {
  return {
    code,
    message: "test error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

describe("toCurrentLocationErrorReason", () => {
  it("classifies permission denial", () => {
    expect(toCurrentLocationErrorReason(createGeolocationError(1))).toBe(
      "geolocation_permission_denied",
    );
  });

  it("classifies timeouts separately", () => {
    expect(toCurrentLocationErrorReason(createGeolocationError(3))).toBe(
      "geolocation_timeout",
    );
  });

  it("classifies unavailable and unknown failures as unavailable", () => {
    expect(toCurrentLocationErrorReason(createGeolocationError(2))).toBe(
      "geolocation_unavailable",
    );
    expect(toCurrentLocationErrorReason(createGeolocationError(99))).toBe(
      "geolocation_unavailable",
    );
  });
});
