import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/apiErrors";
import { MapboxApiError } from "@/api/mapboxErrors";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
import type { LocationSuggestion } from "@/domain/location";
import type { AbortableRequestHandle } from "@/lib/latestAbortableRequest";
import { retrieveAndSelectLocation } from "@/hooks/homeLocationRetrieve";

vi.mock("@/api/mapboxRetrieve", () => ({
  retrieveLocationCoordinates: vi.fn(),
}));

const retrieveLocationCoordinatesMock = vi.mocked(retrieveLocationCoordinates);

const SYDNEY_SUGGESTION: LocationSuggestion = {
  id: "place-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "place-sydney",
  countryCode: "AU",
  sessionToken: "session-sydney",
};

function createRequestHandle(isCurrent = true): AbortableRequestHandle {
  const abortController = new AbortController();

  return {
    signal: abortController.signal,
    isCurrent: () => isCurrent,
    finish: vi.fn(),
  };
}

describe("retrieveAndSelectLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("selects the location with retrieved coordinates for the current request", async () => {
    retrieveLocationCoordinatesMock.mockResolvedValue({
      latitude: -33.847,
      longitude: 151.067,
    });
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(retrieveLocationCoordinatesMock).toHaveBeenCalledWith({
      mapboxId: "place-sydney",
      accessToken: "token",
      sessionToken: "session-sydney",
      signal: request.signal,
    });
    expect(setHasRetrieveError).toHaveBeenCalledWith(false);
    expect(selectLocation).toHaveBeenCalledWith({
      ...SYDNEY_SUGGESTION,
      latitude: -33.847,
      longitude: 151.067,
    });
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("does not select stale retrieve results", async () => {
    retrieveLocationCoordinatesMock.mockResolvedValue({
      latitude: -33.847,
      longitude: 151.067,
    });
    const request = createRequestHandle(false);
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(selectLocation).not.toHaveBeenCalled();
    expect(setHasRetrieveError).not.toHaveBeenCalled();
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("marks a retrieve error when the suggestion is missing a Mapbox id", async () => {
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: {
        ...SYDNEY_SUGGESTION,
        mapboxId: undefined,
      },
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(setHasRetrieveError).toHaveBeenCalledWith(true);
    expect(retrieveLocationCoordinatesMock).not.toHaveBeenCalled();
    expect(selectLocation).not.toHaveBeenCalled();
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("marks a retrieve error when the suggestion is missing a session token", async () => {
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: {
        ...SYDNEY_SUGGESTION,
        sessionToken: undefined,
      },
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(setHasRetrieveError).toHaveBeenCalledWith(true);
    expect(retrieveLocationCoordinatesMock).not.toHaveBeenCalled();
    expect(selectLocation).not.toHaveBeenCalled();
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("marks a retrieve error when the Mapbox token is unavailable", async () => {
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: false,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(setHasRetrieveError).toHaveBeenCalledWith(true);
    expect(retrieveLocationCoordinatesMock).not.toHaveBeenCalled();
    expect(selectLocation).not.toHaveBeenCalled();
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("does not mark a retrieve error when a guard failure is stale", async () => {
    const request = createRequestHandle(false);
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: {
        ...SYDNEY_SUGGESTION,
        mapboxId: undefined,
      },
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(setHasRetrieveError).not.toHaveBeenCalled();
    expect(retrieveLocationCoordinatesMock).not.toHaveBeenCalled();
    expect(selectLocation).not.toHaveBeenCalled();
    expect(request.finish).toHaveBeenCalledTimes(1);
  });

  it("marks retrieve errors without selecting a location", async () => {
    retrieveLocationCoordinatesMock.mockRejectedValue(
      new MapboxApiError({
        endpoint: "retrieve",
        kind: "invalid_response",
        message: "bad payload",
      }),
    );
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(selectLocation).not.toHaveBeenCalled();
    expect(setHasRetrieveError).toHaveBeenCalledWith(true);
    expect(retrieveLocationCoordinatesMock).toHaveBeenCalledTimes(1);
  });

  it("ignores aborts without marking a retrieve error", async () => {
    retrieveLocationCoordinatesMock.mockRejectedValue(
      new ApiError({
        kind: "abort",
        message: "cancelled",
      }),
    );
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(selectLocation).not.toHaveBeenCalled();
    expect(setHasRetrieveError).not.toHaveBeenCalled();
  });

  it("retries one transient retrieve failure before selecting the location", async () => {
    vi.useFakeTimers();
    retrieveLocationCoordinatesMock
      .mockRejectedValueOnce(
        new MapboxApiError({
          endpoint: "retrieve",
          kind: "network",
          message: "offline",
        }),
      )
      .mockResolvedValueOnce({
        latitude: -33.847,
        longitude: 151.067,
      });
    const request = createRequestHandle();
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    const retrievePromise = retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    await vi.runAllTimersAsync();
    await retrievePromise;

    expect(retrieveLocationCoordinatesMock).toHaveBeenCalledTimes(2);
    expect(setHasRetrieveError).toHaveBeenCalledWith(false);
    expect(selectLocation).toHaveBeenCalledWith({
      ...SYDNEY_SUGGESTION,
      latitude: -33.847,
      longitude: 151.067,
    });
  });

  it("does not retry a transient retrieve failure after the request becomes stale", async () => {
    let isCurrent = true;
    retrieveLocationCoordinatesMock.mockImplementationOnce(async () => {
      isCurrent = false;
      throw new MapboxApiError({
        endpoint: "retrieve",
        kind: "network",
        message: "offline",
      });
    });
    const request: AbortableRequestHandle = {
      signal: new AbortController().signal,
      isCurrent: () => isCurrent,
      finish: vi.fn(),
    };
    const selectLocation = vi.fn();
    const setHasRetrieveError = vi.fn();

    await retrieveAndSelectLocation({
      selectedSuggestion: SYDNEY_SUGGESTION,
      hasMapboxToken: true,
      mapboxAccessToken: "token",
      request,
      selectLocation,
      setHasRetrieveError,
    });

    expect(retrieveLocationCoordinatesMock).toHaveBeenCalledTimes(1);
    expect(selectLocation).not.toHaveBeenCalled();
    expect(setHasRetrieveError).not.toHaveBeenCalled();
  });
});
