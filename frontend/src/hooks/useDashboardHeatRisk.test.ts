import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/apiErrors";
import type { SavedDashboardCard } from "@/domain/dashboard";
import type { DashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import { resolveDashboardCardQueryState } from "@/domain/dashboardCardState";
import { useDashboardHeatRisk } from "@/hooks/useDashboardHeatRisk";
import {
  sydneyCard,
  sydneyHeatRiskResponse,
} from "@/test/weeklyWindowFixtures";

const dashboardState = vi.hoisted(() => ({
  cards: [] as SavedDashboardCard[],
  otherPeriodDraft: {
    weekday: 2,
    startMinutes: 1080,
    endMinutes: 1200,
  } as DashboardOtherPeriodDraft,
}));

const queries = vi.hoisted(() => ({
  results: [] as Array<{
    data: unknown;
    error: unknown;
    isLoading: boolean;
    isFetching: boolean;
    isPlaceholderData: boolean;
    isError: boolean;
    refetch: () => Promise<{ isError: boolean }>;
  }>,
}));

vi.mock("@/store/dashboardStore", () => ({
  useDashboardStore: (
    selector: (state: {
      cards: SavedDashboardCard[];
      otherPeriodDraft: DashboardOtherPeriodDraft;
    }) => unknown,
  ) => selector(dashboardState),
}));

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: (data: unknown) => data,
  useQueries: () => queries.results,
}));

beforeEach(() => {
  dashboardState.cards = [sydneyCard];
  dashboardState.otherPeriodDraft = {
    weekday: 2,
    startMinutes: 1080,
    endMinutes: 1200,
  };
  queries.results = [
    {
      data: sydneyHeatRiskResponse(),
      error: null,
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      refetch: async () => ({ isError: false }),
    },
  ];
});

function readWeeklyStatus(card = sydneyCard): string {
  function Probe() {
    return useDashboardHeatRisk().getWeeklyPreviewSource(card).status;
  }
  return renderToStaticMarkup(createElement(Probe));
}

function readCardStatus(card = sydneyCard): string {
  function Probe() {
    return useDashboardHeatRisk().getCardState(card).status;
  }
  return renderToStaticMarkup(createElement(Probe));
}

function readScheduledCardStatus(
  card: SavedDashboardCard = {
    ...sydneyCard,
    schedule: { weekdays: [2], startMinutes: 1080, endMinutes: 1200 },
  },
): string {
  function Probe() {
    return useDashboardHeatRisk().getScheduledCardState(
      card,
      new Date("2026-09-15T00:00:00Z"),
    ).status;
  }
  return renderToStaticMarkup(createElement(Probe));
}

function readOtherPeriodCardStatus(card = sydneyCard): string {
  function Probe() {
    return useDashboardHeatRisk().getOtherPeriodCardState(
      card,
      new Date("2026-09-15T00:00:00Z"),
    ).status;
  }
  return renderToStaticMarkup(createElement(Probe));
}

describe("weekly preview query adapter", () => {
  it("returns the matching card forecast", () => {
    expect(readWeeklyStatus()).toBe("ok");
  });

  it.each(["isFetching", "isPlaceholderData"] as const)(
    "does not show cached risks while %s",
    (flag) => {
      queries.results[0][flag] = true;
      expect(readWeeklyStatus()).toBe("loading");
      expect(readCardStatus()).toBe("loading");
    },
  );

  it("does not show cached risks after a failed refresh", () => {
    queries.results[0].isError = true;
    queries.results[0].error = new ApiError({
      kind: "network",
      message: "network",
    });
    expect(readWeeklyStatus()).toBe("unavailable");
    expect(readCardStatus()).toBe("fetch_error");
  });

  it("returns unavailable before any result exists", () => {
    queries.results[0].data = undefined;
    expect(readWeeklyStatus()).toBe("unavailable");
  });

  it("does not substitute a different card's forecast", () => {
    expect(
      readWeeklyStatus({
        ...sydneyCard,
        id: "melbourne",
        name: "Melbourne",
        latitude: -37.81,
        longitude: 144.96,
      }),
    ).toBe("unavailable");
  });
});

describe("dashboard card query adapter", () => {
  it("connects a saved schedule to the matching card forecast", () => {
    expect(readScheduledCardStatus()).toBe("ok");
  });

  it("returns ok card metrics for a loaded card", () => {
    expect(
      resolveDashboardCardQueryState({
        data: sydneyHeatRiskResponse(),
        isLoading: false,
        isFetching: false,
        isPlaceholderData: false,
        isError: false,
        errorReason: null,
        locationErrorCode: null,
      }),
    ).toEqual({
      status: "ok",
      currentRiskScore: 1.2,
      todayMaxRiskScore: 3.2,
      currentRiskLevel: "low",
      todayMaxRiskLevel: "high",
    });
  });

  it("returns missing_result for an unknown card query", () => {
    expect(resolveDashboardCardQueryState(undefined)).toEqual({
      status: "missing_result",
    });
  });

  it("shows loading while the card query is in flight", () => {
    expect(
      resolveDashboardCardQueryState({
        data: undefined,
        isLoading: true,
        isFetching: false,
        isPlaceholderData: false,
        isError: false,
        errorReason: null,
        locationErrorCode: null,
      }),
    ).toEqual({ status: "loading" });
  });

  it("shows fetch errors when the card request fails before any data exists", () => {
    expect(
      resolveDashboardCardQueryState({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isPlaceholderData: false,
        isError: true,
        errorReason: "network",
        locationErrorCode: null,
      }),
    ).toEqual({
      status: "fetch_error",
      reason: "network",
    });
  });

  it("shows location_error for unknown inputs", () => {
    expect(
      resolveDashboardCardQueryState({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isPlaceholderData: false,
        isError: true,
        errorReason: null,
        locationErrorCode: "unknown_inputs",
      }),
    ).toEqual({
      status: "location_error",
      errorCode: "unknown_inputs",
    });
  });

  it("shows loading instead of stale metrics while placeholder data is active", () => {
    expect(
      resolveDashboardCardQueryState({
        data: sydneyHeatRiskResponse(),
        isLoading: false,
        isFetching: true,
        isPlaceholderData: true,
        isError: false,
        errorReason: null,
        locationErrorCode: null,
      }),
    ).toEqual({ status: "loading" });
  });

  it("keeps invalid other-period drafts distinct from incomplete ones", () => {
    dashboardState.otherPeriodDraft = {
      weekday: 2,
      startMinutes: 1080,
      endMinutes: 540,
    };
    expect(readOtherPeriodCardStatus()).toBe("invalid_selection");

    dashboardState.otherPeriodDraft = {
      weekday: 2,
      startMinutes: 1080,
      endMinutes: null,
    };
    expect(readOtherPeriodCardStatus()).toBe("missing_selection");
  });

  it("shows fetch_error instead of stale metrics after a failed refresh", () => {
    expect(
      resolveDashboardCardQueryState({
        data: sydneyHeatRiskResponse(),
        isLoading: false,
        isFetching: false,
        isPlaceholderData: false,
        isError: true,
        errorReason: "network",
        locationErrorCode: null,
      }),
    ).toEqual({
      status: "fetch_error",
      reason: "network",
    });
  });
});
