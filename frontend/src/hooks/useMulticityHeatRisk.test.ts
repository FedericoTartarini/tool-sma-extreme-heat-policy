import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BatchHeatRiskApiResponse } from "@/api/heatRiskBatch";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import type { SavedLocation } from "@/domain/multicity";
import { buildMulticityLocationCoordsKey } from "@/domain/multicityBatch";
import { useMulticityHeatRisk } from "@/hooks/useMulticityHeatRisk";
import { DEFAULT_SPORT_TYPE, SportType } from "@/domain/sport";
import { ApiError } from "@/api/apiErrors";
import { useMulticityStore } from "@/store/multicityStore";

const { useQueryMock, fetchHeatRiskBatchMock, debouncedValueRef } = vi.hoisted(
  () => ({
    useQueryMock: vi.fn(),
    fetchHeatRiskBatchMock: vi.fn(),
    debouncedValueRef: { current: null as unknown },
  }),
);

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: <T>(value: T | undefined) => value,
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@mantine/hooks", () => ({
  useDebouncedValue: <T>(value: T) => [
    (debouncedValueRef.current as T | null) ?? value,
  ],
}));

vi.mock("@/api/heatRiskBatch", () => ({
  fetchHeatRiskBatch: (...args: unknown[]) => fetchHeatRiskBatchMock(...args),
}));

vi.mock("@/store/multicityStore", async () => {
  const actual = await vi.importActual<typeof import("@/store/multicityStore")>(
    "@/store/multicityStore",
  );
  const realStore = actual.useMulticityStore;

  const useMulticityStore = Object.assign(
    <T>(selector: (state: ReturnType<typeof realStore.getState>) => T): T =>
      selector(realStore.getState()),
    {
      getState: realStore.getState,
      setState: realStore.setState,
      subscribe: realStore.subscribe,
    },
  );

  return { useMulticityStore };
});

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

const BATCH_RESPONSE: BatchHeatRiskApiResponse = {
  request: {
    sport: SportType.Soccer,
    profile: DEFAULT_HEAT_RISK_PROFILE,
  },
  locations: [
    {
      latitude: -33.847,
      longitude: 151.067,
      timezone: "Australia/Sydney",
      status: "ok",
      current_risk_level_interpolated: 1.94,
      today_max_risk_level_interpolated: 2.14,
      current_time_local: "2026-03-09T11:00:00+11:00",
      error_code: null,
      detail: null,
    },
    {
      latitude: -37.813,
      longitude: 144.963,
      timezone: null,
      status: "error",
      current_risk_level_interpolated: null,
      today_max_risk_level_interpolated: null,
      current_time_local: null,
      error_code: "weather_provider_unavailable",
      detail: "Weather provider unavailable",
    },
  ],
};

function resetMulticityStore() {
  useMulticityStore.setState({
    isBootstrapped: true,
    sport: DEFAULT_SPORT_TYPE,
    locations: [],
    locationSearchInput: "",
    locationSessionToken: "session-initial",
  });
}

function seedMulticityStore(
  locations: SavedLocation[],
  sport: (typeof SportType)[keyof typeof SportType] = DEFAULT_SPORT_TYPE,
) {
  useMulticityStore.getState().bootstrap({ sport, locations });
}

function invokeUseMulticityHeatRisk() {
  let hookResult: ReturnType<typeof useMulticityHeatRisk> | undefined;

  function Probe() {
    // Static test probe: capture the hook result outside React state.
    // eslint-disable-next-line react-hooks/globals -- test helper
    hookResult = useMulticityHeatRisk();
    return null;
  }

  renderToStaticMarkup(createElement(Probe));

  if (!hookResult) {
    throw new Error("useMulticityHeatRisk did not run");
  }

  return hookResult;
}

function getLatestUseQueryOptions(): {
  queryKey: unknown[];
  enabled: boolean;
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
  refetchInterval?: number;
} {
  const latestCall = useQueryMock.mock.calls.at(-1)?.[0];

  if (!latestCall) {
    throw new Error("useQuery was not called");
  }

  return latestCall as {
    queryKey: unknown[];
    enabled: boolean;
    queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
    refetchInterval?: number;
  };
}

describe("useMulticityHeatRisk", () => {
  beforeEach(() => {
    resetMulticityStore();
    debouncedValueRef.current = null;
    useQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });
    fetchHeatRiskBatchMock.mockReset();
  });

  afterEach(() => {
    resetMulticityStore();
    debouncedValueRef.current = null;
    useQueryMock.mockClear();
    fetchHeatRiskBatchMock.mockClear();
  });

  it("disables the batch query when there are no saved locations", () => {
    const result = invokeUseMulticityHeatRisk();

    expect(getLatestUseQueryOptions()).toMatchObject({
      enabled: false,
    });
    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "missing_result",
    });
  });

  it("enables the batch query with sport, profile, and coordinate key", () => {
    seedMulticityStore(
      [SYDNEY_LOCATION, MELBOURNE_LOCATION],
      SportType.Running,
    );

    invokeUseMulticityHeatRisk();

    expect(getLatestUseQueryOptions()).toMatchObject({
      enabled: true,
      queryKey: [
        "heatRiskBatch",
        SportType.Running,
        DEFAULT_HEAT_RISK_PROFILE,
        buildMulticityLocationCoordsKey([SYDNEY_LOCATION, MELBOURNE_LOCATION]),
      ],
    });
    expect(getLatestUseQueryOptions().refetchInterval).toBeUndefined();
  });

  it("returns loading card state while the initial batch request is pending", () => {
    seedMulticityStore([SYDNEY_LOCATION]);
    useQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
      isFetching: true,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.isFetching).toBe(true);
    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "loading",
    });
  });

  it("maps successful batch results to per-city card state", () => {
    seedMulticityStore([SYDNEY_LOCATION, MELBOURNE_LOCATION]);
    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "ok",
      currentRiskLevel: "low",
      todayMaxRiskLevel: "moderate",
    });
    expect(result.getCardState(MELBOURNE_LOCATION)).toEqual({
      status: "location_error",
      errorCode: "weather_provider_unavailable",
      detail: "Weather provider unavailable",
    });
  });

  it("returns batch_error card state when the initial request fails", () => {
    seedMulticityStore([SYDNEY_LOCATION]);
    useQueryMock.mockReturnValue({
      data: undefined,
      error: new ApiError({
        kind: "network",
        message: "network",
      }),
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "batch_error",
      reason: "network",
    });
  });

  it("keeps previous card data while a refetch is in flight", () => {
    seedMulticityStore([SYDNEY_LOCATION]);
    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: true,
      isFetching: true,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "ok",
      currentRiskLevel: "low",
      todayMaxRiskLevel: "moderate",
    });
  });

  it("shows loading for a newly added city while previous batch data is kept", () => {
    seedMulticityStore([SYDNEY_LOCATION, MELBOURNE_LOCATION]);
    useQueryMock.mockReturnValue({
      data: {
        ...BATCH_RESPONSE,
        locations: [BATCH_RESPONSE.locations[0]],
      },
      error: null,
      isPending: false,
      isFetching: true,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "ok",
      currentRiskLevel: "low",
      todayMaxRiskLevel: "moderate",
    });
    expect(result.getCardState(MELBOURNE_LOCATION)).toEqual({
      status: "loading",
    });
  });

  it("shows loading for every card when placeholder data is for a different sport", () => {
    seedMulticityStore(
      [SYDNEY_LOCATION, MELBOURNE_LOCATION],
      SportType.Running,
    );
    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: false,
      isFetching: true,
      isPlaceholderData: true,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "loading",
    });
    expect(result.getCardState(MELBOURNE_LOCATION)).toEqual({
      status: "loading",
    });
  });

  it("keeps same-sport placeholder data for existing cities when a city is added", () => {
    seedMulticityStore([SYDNEY_LOCATION, MELBOURNE_LOCATION]);
    useQueryMock.mockReturnValue({
      data: {
        ...BATCH_RESPONSE,
        locations: [BATCH_RESPONSE.locations[0]],
      },
      error: null,
      isPending: false,
      isFetching: true,
      isPlaceholderData: true,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "ok",
      currentRiskLevel: "low",
      todayMaxRiskLevel: "moderate",
    });
    expect(result.getCardState(MELBOURNE_LOCATION)).toEqual({
      status: "loading",
    });
  });

  it("shows loading while the displayed sport is ahead of the debounced query sport", () => {
    seedMulticityStore([SYDNEY_LOCATION], SportType.Running);
    debouncedValueRef.current = SportType.Soccer;
    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    const result = invokeUseMulticityHeatRisk();

    expect(result.getCardState(SYDNEY_LOCATION)).toEqual({
      status: "loading",
    });
  });

  it("keeps the same query key when saved locations are reordered", () => {
    seedMulticityStore([SYDNEY_LOCATION, MELBOURNE_LOCATION]);
    invokeUseMulticityHeatRisk();
    const initialQueryKey = getLatestUseQueryOptions().queryKey;

    seedMulticityStore([MELBOURNE_LOCATION, SYDNEY_LOCATION]);
    invokeUseMulticityHeatRisk();

    expect(getLatestUseQueryOptions().queryKey).toEqual(initialQueryKey);
  });

  it("calls fetchHeatRiskBatch with the debounced sport and saved coordinates", async () => {
    seedMulticityStore([SYDNEY_LOCATION], SportType.Cricket);
    fetchHeatRiskBatchMock.mockResolvedValue({
      ok: true,
      data: BATCH_RESPONSE,
    });

    invokeUseMulticityHeatRisk();

    const { queryFn } = getLatestUseQueryOptions();
    const controller = new AbortController();

    await queryFn({ signal: controller.signal });

    expect(fetchHeatRiskBatchMock).toHaveBeenCalledWith(
      {
        sport: SportType.Cricket,
        profile: DEFAULT_HEAT_RISK_PROFILE,
        locations: [
          {
            latitude: SYDNEY_LOCATION.latitude,
            longitude: SYDNEY_LOCATION.longitude,
          },
        ],
      },
      { signal: controller.signal },
    );
  });

  it("reconfigures the query key when the multicity sport changes", () => {
    seedMulticityStore([SYDNEY_LOCATION], SportType.Soccer);

    invokeUseMulticityHeatRisk();
    const initialQueryKey = getLatestUseQueryOptions().queryKey;

    useMulticityStore.getState().setSport(SportType.Running);
    invokeUseMulticityHeatRisk();
    const nextQueryKey = getLatestUseQueryOptions().queryKey;

    expect(initialQueryKey).not.toEqual(nextQueryKey);
    expect(nextQueryKey[1]).toBe(SportType.Running);
  });

  it("reports a loaded batch only after the first successful response", () => {
    seedMulticityStore([SYDNEY_LOCATION]);
    useQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
      isFetching: true,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    expect(invokeUseMulticityHeatRisk().hasLoadedBatch).toBe(false);

    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });

    expect(invokeUseMulticityHeatRisk().hasLoadedBatch).toBe(true);
  });

  it("refetches the batch query and reports success", async () => {
    seedMulticityStore([SYDNEY_LOCATION]);
    const refetch = vi.fn().mockResolvedValue({ isError: false });
    useQueryMock.mockReturnValue({
      data: BATCH_RESPONSE,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch,
    });

    const didRefresh = await invokeUseMulticityHeatRisk().refresh();

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(didRefresh).toBe(true);
  });

  it("does not refetch when there are no saved locations", async () => {
    const refetch = vi.fn().mockResolvedValue({ isError: false });
    useQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      refetch,
    });

    const didRefresh = await invokeUseMulticityHeatRisk().refresh();

    expect(refetch).not.toHaveBeenCalled();
    expect(didRefresh).toBe(false);
  });
});
