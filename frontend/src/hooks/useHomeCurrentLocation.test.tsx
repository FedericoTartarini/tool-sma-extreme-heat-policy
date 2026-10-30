// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { LocationSuggestion } from "@/domain/location";
import {
  LOCATION_SUGGEST_TYPES_PARAM,
  prepareLocationSuggestions,
} from "@/domain/locationSearch";
import { useHomeStore } from "@/store/homeStore";
import { renderHook } from "@/test/renderHook";
import {
  toCurrentLocationErrorReason,
  useHomeCurrentLocation,
} from "@/hooks/useHomeCurrentLocation";
import { useHomeLocationSuggest } from "@/hooks/useHomeLocationSuggest";

vi.mock("@/api/mapboxReverseGeocode", () => ({
  reverseGeocodeCoordinates: vi.fn(),
}));
vi.mock("@/api/mapboxRetrieve", () => ({
  retrieveLocationCoordinates: vi.fn(),
}));
vi.mock("@/api/mapboxSuggest", () => ({ suggestLocations: vi.fn() }));

const detected: LocationSuggestion = {
  id: "redfern",
  mapboxId: "redfern",
  name: "Redfern",
  displayLabel: "Redfern, New South Wales, Australia",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.89,
  longitude: 151.2,
};
const searched: LocationSuggestion = {
  id: "perth",
  mapboxId: "perth",
  name: "Perth",
  displayLabel: "Perth, Western Australia, Australia",
  regionName: "Western Australia",
  countryName: "Australia",
  sessionToken: "initial",
};
const saved = { ...searched, latitude: -31.95, longitude: 115.86 };
const position: GeolocationPosition = {
  coords: {
    latitude: -33.89,
    longitude: 151.2,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 1,
  toJSON: () => ({}),
};
function geolocationError(code: number): GeolocationPositionError {
  return {
    code,
    message: "test",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>();
const cleanup: Array<() => void> = [];
function mount() {
  const hook = renderHook(useHomeCurrentLocation);
  cleanup.push(hook.unmount);
  return hook;
}
function mountBoth() {
  useHomeStore.setState({
    locationSearchInput: "Per",
    locationSessionToken: "initial",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(
    ["mapboxSuggest", "Per", "initial", "en", LOCATION_SUGGEST_TYPES_PARAM],
    prepareLocationSuggestions({ suggestions: [searched] }),
  );
  const hook = renderHook(
    () => ({
      detection: useHomeCurrentLocation(),
      search: useHomeLocationSuggest(),
    }),
    (children) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  );
  cleanup.push(() => {
    hook.unmount();
    client.clear();
  });
  expect(hook.current.search.locationSuggestions).toEqual([searched]);
  return hook;
}
async function completeGps(index = 0) {
  await act(async () => {
    getCurrentPosition.mock.calls[index]![0](position);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test-token");
  vi.stubGlobal("navigator", {
    language: "en",
    languages: ["en"],
    geolocation: { getCurrentPosition },
  });
  useHomeStore.setState({
    ...useHomeStore.getInitialState(),
    locationSessionToken: "initial",
  });
  vi.mocked(reverseGeocodeCoordinates).mockResolvedValue([detected]);
  vi.mocked(suggestLocations).mockResolvedValue([searched]);
});
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("toCurrentLocationErrorReason", () => {
  it.each([
    [1, "geolocation_permission_denied"],
    [3, "geolocation_timeout"],
    [2, "geolocation_unavailable"],
    [99, "geolocation_unavailable"],
  ])("maps browser error %s to %s", (code, reason) => {
    expect(toCurrentLocationErrorReason(geolocationError(Number(code)))).toBe(
      reason,
    );
  });
});

describe("useHomeCurrentLocation", () => {
  it("requests location only after a click and updates busy state through lookup success", async () => {
    const lookup = deferred<LocationSuggestion[]>();
    vi.mocked(reverseGeocodeCoordinates).mockReturnValue(lookup.promise);
    const hook = mount();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(hook.current.isDetecting).toBe(false);
    act(() => hook.current.requestCurrentLocation());
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(hook.current.isDetecting).toBe(true);
    await completeGps();
    expect(reverseGeocodeCoordinates).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -33.89, longitude: 151.2 }),
    );
    expect(hook.current.isDetecting).toBe(true);
    await act(async () => lookup.resolve([detected]));
    expect(useHomeStore.getState().selectedLocation).toEqual(detected);
    expect(hook.current.isDetecting).toBe(false);
    expect(hook.current.error).toBeNull();
  });

  it("reports no usable place and stops detection", async () => {
    vi.mocked(reverseGeocodeCoordinates).mockResolvedValue([]);
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    await completeGps();
    expect(hook.current.error?.reason).toBe("location_not_resolved");
    expect(hook.current.isDetecting).toBe(false);
    expect(useHomeStore.getState().selectedLocation).toBeNull();
  });

  it("reports lookup failures and preserves the previous location", async () => {
    useHomeStore.setState({ selectedLocation: saved });
    vi.mocked(reverseGeocodeCoordinates).mockRejectedValue(
      new Error("network failed"),
    );
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    await completeGps();
    expect(hook.current.error?.reason).toBe("reverse_geocode_failed");
    expect(hook.current.isDetecting).toBe(false);
    expect(useHomeStore.getState().selectedLocation).toEqual(saved);
  });

  it("reports a browser permission error and allows retry", () => {
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    act(() => getCurrentPosition.mock.calls[0]![1]!(geolocationError(1)));
    expect(hook.current.error?.reason).toBe("geolocation_permission_denied");
    expect(hook.current.isDetecting).toBe(false);
    act(() => hook.current.requestCurrentLocation());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(hook.current.error).toBeNull();
    expect(hook.current.isDetecting).toBe(true);
  });

  it("ends an unanswered permission request, emits timeout, and retries on the next click", async () => {
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    act(() => vi.advanceTimersByTime(15_000));
    expect(hook.current.isDetecting).toBe(false);
    expect(hook.current.error?.reason).toBe("geolocation_timeout");
    act(() => hook.current.requestCurrentLocation());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(hook.current.isDetecting).toBe(true);
    await completeGps(0);
    expect(reverseGeocodeCoordinates).not.toHaveBeenCalled();
    await completeGps(1);
    expect(useHomeStore.getState().selectedLocation).toEqual(detected);
    expect(hook.current.isDetecting).toBe(false);
    expect(hook.current.error).toBeNull();
  });

  it("times out a stalled reverse lookup and ignores its late result", async () => {
    const lookup = deferred<LocationSuggestion[]>();
    vi.mocked(reverseGeocodeCoordinates).mockReturnValue(lookup.promise);
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    await completeGps();
    const signal = vi.mocked(reverseGeocodeCoordinates).mock.calls[0]![0]
      .signal;
    act(() => vi.advanceTimersByTime(15_000));
    expect(hook.current.isDetecting).toBe(false);
    expect(hook.current.error?.reason).toBe("reverse_geocode_failed");
    expect(signal?.aborted).toBe(true);
    await act(async () => lookup.resolve([detected]));
    expect(useHomeStore.getState().selectedLocation).toBeNull();
  });

  it.each(["missing_token", "geolocation_unavailable"] as const)(
    "emits a fresh %s error on each click",
    (reason) => {
      if (reason === "missing_token")
        vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
      else vi.stubGlobal("navigator", { language: "en", languages: ["en"] });
      const hook = mount();
      act(() => hook.current.requestCurrentLocation());
      const firstError = hook.current.error;
      expect(firstError?.reason).toBe(reason);
      act(() => hook.current.requestCurrentLocation());
      expect(hook.current.error?.reason).toBe(reason);
      expect(hook.current.error?.eventId).toBeGreaterThan(firstError!.eventId);
      expect(hook.current.isDetecting).toBe(false);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    },
  );

  it("ignores the first GPS callback after a newer detection click", async () => {
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    act(() => hook.current.requestCurrentLocation());
    await completeGps(0);
    expect(reverseGeocodeCoordinates).not.toHaveBeenCalled();
    expect(hook.current.isDetecting).toBe(true);
    await completeGps(1);
    expect(useHomeStore.getState().selectedLocation).toEqual(detected);
  });

  it.each(["Sydney", ""])(
    "preserves the latest edit %j from an initially empty field",
    async (text) => {
      const hook = mount();
      act(() => hook.current.requestCurrentLocation());
      act(() => useHomeStore.getState().setLocationSearchInput(text));
      expect(hook.current.isDetecting).toBe(false);
      await completeGps();
      act(() => vi.advanceTimersByTime(30_000));
      expect(reverseGeocodeCoordinates).not.toHaveBeenCalled();
      expect(useHomeStore.getState().locationSearchInput).toBe(text);
      expect(useHomeStore.getState().selectedLocation).toBeNull();
      expect(hook.current.error).toBeNull();
    },
  );

  it.each(["success", "empty", "error"])(
    "ignores a late reverse lookup %s after the user edits",
    async (outcome) => {
      const lookup = deferred<LocationSuggestion[]>();
      vi.mocked(reverseGeocodeCoordinates).mockReturnValue(lookup.promise);
      const hook = mount();
      act(() => hook.current.requestCurrentLocation());
      await completeGps();
      const signal = vi.mocked(reverseGeocodeCoordinates).mock.calls[0]![0]
        .signal;
      act(() => useHomeStore.getState().setLocationSearchInput("Melbourne"));
      expect(signal?.aborted).toBe(true);
      expect(hook.current.isDetecting).toBe(false);
      await act(async () => {
        if (outcome === "error") lookup.reject(new Error("late error"));
        else lookup.resolve(outcome === "empty" ? [] : [detected]);
      });
      expect(useHomeStore.getState().locationSearchInput).toBe("Melbourne");
      expect(useHomeStore.getState().selectedLocation).toBeNull();
      expect(hook.current.error).toBeNull();
    },
  );

  it("cancels detection when a saved location is selected without showing a stale timeout", async () => {
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    act(() => useHomeStore.getState().selectLocation(saved));
    expect(hook.current.isDetecting).toBe(false);
    await completeGps();
    act(() => vi.advanceTimersByTime(30_000));
    expect(useHomeStore.getState().selectedLocation).toEqual(saved);
    expect(hook.current.error).toBeNull();
  });

  it("cancels GPS and ignores late results on unmount", async () => {
    const hook = mount();
    act(() => hook.current.requestCurrentLocation());
    cleanup.pop()!();
    await completeGps();
    expect(reverseGeocodeCoordinates).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(useHomeStore.getState().selectedLocation).toBeNull();
  });
});

describe("location selection across search and detection", () => {
  it("a newer detection cancels a pending search retrieval", async () => {
    const retrieval = deferred<{ latitude: number; longitude: number }>();
    vi.mocked(retrieveLocationCoordinates).mockReturnValue(retrieval.promise);
    const hook = mountBoth();
    act(() => hook.current.search.onLocationOptionSubmit(searched.id));
    expect(retrieveLocationCoordinates).toHaveBeenCalledOnce();
    const signal = vi.mocked(retrieveLocationCoordinates).mock.calls[0]![0]
      .signal;
    act(() => hook.current.detection.requestCurrentLocation());
    expect(signal?.aborted).toBe(true);
    await completeGps();
    await act(async () =>
      retrieval.resolve({ latitude: -31.95, longitude: 115.86 }),
    );
    expect(useHomeStore.getState().selectedLocation).toEqual(detected);
    expect(hook.current.search.suggestErrorReason).toBeNull();
  });

  it("a newer search pick cancels a pending detection lookup", async () => {
    const lookup = deferred<LocationSuggestion[]>();
    vi.mocked(reverseGeocodeCoordinates).mockReturnValue(lookup.promise);
    vi.mocked(retrieveLocationCoordinates).mockResolvedValue({
      latitude: -31.95,
      longitude: 115.86,
    });
    const hook = mountBoth();
    act(() => hook.current.detection.requestCurrentLocation());
    await completeGps();
    const signal = vi.mocked(reverseGeocodeCoordinates).mock.calls[0]![0]
      .signal;
    await act(async () =>
      hook.current.search.onLocationOptionSubmit(searched.id),
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => lookup.resolve([]));
    expect(useHomeStore.getState().selectedLocation).toEqual(saved);
    expect(hook.current.detection.isDetecting).toBe(false);
    expect(hook.current.detection.error).toBeNull();
  });

  it("typing through the search hook cancels detection before GPS returns", async () => {
    const hook = mountBoth();
    act(() => hook.current.detection.requestCurrentLocation());
    act(() => hook.current.search.onLocationSearchInputChange("Sydney"));
    await completeGps();
    expect(useHomeStore.getState().locationSearchInput).toBe("Sydney");
    expect(useHomeStore.getState().selectedLocation).toBeNull();
    expect(hook.current.detection.isDetecting).toBe(false);
    expect(reverseGeocodeCoordinates).not.toHaveBeenCalled();
  });
});
