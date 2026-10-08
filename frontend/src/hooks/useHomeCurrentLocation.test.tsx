import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useCallback } from "react";
import { appTheme } from "@/config/mantineTheme";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import type { LocationSuggestion } from "@/domain/location";
import { DEFAULT_SPORT_TYPE } from "@/domain/sport";
import { useHomeStore } from "@/store/homeStore";
import {
  toCurrentLocationErrorReason,
  useHomeCurrentLocation,
  type CurrentLocationErrorEvent,
} from "@/hooks/useHomeCurrentLocation";

function createGeolocationError(code: number): GeolocationPositionError {
  return {
    code,
    message: "test error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

const INITIAL_SESSION_TOKEN = "session-initial";

const USER_PICKED_LOCATION: LocationSuggestion = {
  id: "loc-perth",
  displayLabel: "Perth, Western Australia, Australia",
  name: "Perth",
  regionName: "Western Australia",
  countryName: "Australia",
  mapboxId: "mapbox-perth",
  countryCode: "AU",
  latitude: -31.9523,
  longitude: 115.8613,
  sessionToken: "session-perth",
};

function resetHomeStore() {
  useHomeStore.setState({
    isBootstrapped: false,
    channel: "direct",
    profile: DEFAULT_HEAT_RISK_PROFILE,
    sport: DEFAULT_SPORT_TYPE,
    locationSearchInput: "",
    locationPrefillSource: "none",
    selectedLocation: null,
    prefilledLocationResolveState: "idle",
    locationSessionToken: INITIAL_SESSION_TOKEN,
  });
}

interface HookHandle {
  isDetecting: boolean;
  error: CurrentLocationErrorEvent | null;
  requestCurrentLocation: () => void;
}

let hookHandle: HookHandle | null = null;

function TestHarness() {
  const hook = useHomeCurrentLocation();

  /*
   * Test harness only — this throwaway SSR component re-renders inside a single
   * static-markup render only to expose the stable synchronous
   * `requestCurrentLocation` callback that calls into the hook's orchestration
   * logic. useState-backed `error` and `isDetecting` reads are intentionally
   * asserted via the downstream `LocationFieldActionIcons` integration test,
   * because independent SSR renders do not share component state across roots.
   */
  // eslint-disable-next-line react-hooks/globals
  hookHandle = {
    isDetecting: hook.isDetecting,
    error: hook.error,
    requestCurrentLocation: useCallback(
      () => hook.requestCurrentLocation(),
      [hook],
    ),
  };

  return null;
}

function mountHook() {
  renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <TestHarness />
    </MantineProvider>,
  );
  if (!hookHandle) {
    throw new Error("hook handle was not captured during mount");
  }

  return hookHandle;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
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

describe("useHomeCurrentLocation", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    resetHomeStore();
    hookHandle = null;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      geolocation: undefined,
      language: "en",
      languages: ["en"],
    });
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  });

  it("preserves the initial session token snapshot for late race checks", () => {
    const handle = mountHook();
    const before = useHomeStore.getState().locationSessionToken;
    handle.requestCurrentLocation();
    const afterNoMutate = useHomeStore.getState().locationSessionToken;
    expect(afterNoMutate).toBe(before);
  });

  it("resolves coordinates through reverse geocode and commits the selection", async () => {
    const successCallbacks: Array<(position: GeolocationPosition) => void> = [];
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: (position: GeolocationPosition) => void,
        ) => {
          successCallbacks.push(success);
        },
      },
      language: "en",
      languages: ["en"],
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                mapbox_id: "locality-redfern",
                feature_type: "locality",
                name: "Redfern",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                  region: { name: "New South Wales" },
                  place: { name: "Sydney" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const handle = mountHook();
    handle.requestCurrentLocation();
    expect(successCallbacks).toHaveLength(1);

    successCallbacks[0]!({
      coords: {
        latitude: -33.89334,
        longitude: 151.20461,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: 1,
      toJSON: () => ({}),
    });

    await flushMicrotasks();

    expect(useHomeStore.getState().selectedLocation).toEqual(
      expect.objectContaining({
        id: "locality-redfern",
        mapboxId: "locality-redfern",
        displayLabel: "Redfern, New South Wales, Australia",
        name: "Redfern",
      }),
    );
  });

  it("silently skips a stale detection result when the user picked another location mid-flight", async () => {
    const successCallbacks: Array<(position: GeolocationPosition) => void> = [];
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: (position: GeolocationPosition) => void,
        ) => {
          successCallbacks.push(success);
        },
      },
      language: "en",
      languages: ["en"],
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                mapbox_id: "locality-redfern",
                feature_type: "locality",
                name: "Redfern",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                  region: { name: "New South Wales" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const handle = mountHook();
    handle.requestCurrentLocation();
    expect(successCallbacks).toHaveLength(1);

    useHomeStore.getState().selectLocation(USER_PICKED_LOCATION);

    successCallbacks[0]!({
      coords: {
        latitude: -33.89334,
        longitude: 151.20461,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: 1,
      toJSON: () => ({}),
    });

    await flushMicrotasks();

    expect(useHomeStore.getState().selectedLocation).toEqual(
      expect.objectContaining({
        id: USER_PICKED_LOCATION.id,
        displayLabel: USER_PICKED_LOCATION.displayLabel,
      }),
    );
  });

  it("leaves selectedLocation empty when reverse geocode returns no suggestions", async () => {
    const successCallbacks: Array<(position: GeolocationPosition) => void> = [];
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: (position: GeolocationPosition) => void,
        ) => {
          successCallbacks.push(success);
        },
      },
      language: "en",
      languages: ["en"],
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ features: [] }), { status: 200 }),
    );

    const handle = mountHook();
    handle.requestCurrentLocation();
    expect(successCallbacks).toHaveLength(1);

    successCallbacks[0]!({
      coords: {
        latitude: 1.3521,
        longitude: 103.8198,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: 1,
      toJSON: () => ({}),
    });

    await flushMicrotasks();

    expect(useHomeStore.getState().selectedLocation).toBeNull();
  });
});
