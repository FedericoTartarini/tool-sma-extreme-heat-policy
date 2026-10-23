import { describe, expect, it } from "vitest";
import type { HeatRiskApiResponse } from "@/api/heatRisk";
import {
  resolveDashboardCardQueryState,
  resolveDashboardCardState,
  resolveWeeklyPreviewSourceFromQuery,
  toDashboardCardErrorI18nKey,
} from "@/domain/dashboardCardState";
import { sydneyHeatRiskResponse } from "@/test/weeklyWindowFixtures";

function responseWithEmptyForecast(): HeatRiskApiResponse {
  return {
    ...sydneyHeatRiskResponse(),
    forecast: [],
  };
}

describe("dashboardCardState", () => {
  it("returns loading while the first fetch is in flight", () => {
    expect(
      resolveDashboardCardState(undefined, {
        isLoading: true,
      }),
    ).toEqual({ status: "loading" });
  });

  it("returns fetch_error when a card request fails before any data exists", () => {
    expect(
      resolveDashboardCardState(undefined, {
        errorReason: "network",
      }),
    ).toEqual({
      status: "fetch_error",
      reason: "network",
    });
  });

  it("returns loading while refetching without placeholder data", () => {
    expect(
      resolveDashboardCardState(undefined, {
        isFetching: true,
      }),
    ).toEqual({ status: "loading" });
  });

  it("returns missing_result when no response is available yet", () => {
    expect(resolveDashboardCardState(undefined)).toEqual({
      status: "missing_result",
    });
  });

  it("returns ok metrics from a valid heat-risk response", () => {
    const state = resolveDashboardCardState(sydneyHeatRiskResponse(), {
      isPlaceholderData: false,
      isError: false,
    });

    expect(state).toEqual({
      status: "ok",
      currentRiskScore: 1.2,
      todayMaxRiskScore: 3.2,
      currentRiskLevel: "low",
      todayMaxRiskLevel: "high",
    });
  });

  it("returns loading while a refetch is in flight", () => {
    expect(
      resolveDashboardCardState(sydneyHeatRiskResponse(), {
        isFetching: true,
      }),
    ).toEqual({ status: "loading" });
  });

  it("returns loading while placeholder data is shown during refetch", () => {
    expect(
      resolveDashboardCardState(sydneyHeatRiskResponse(), {
        isPlaceholderData: true,
        isFetching: true,
      }),
    ).toEqual({ status: "loading" });
  });

  it("returns fetch_error after a failed refresh instead of stale metrics", () => {
    expect(
      resolveDashboardCardState(sydneyHeatRiskResponse(), {
        isError: true,
        errorReason: "network",
      }),
    ).toEqual({
      status: "fetch_error",
      reason: "network",
    });
  });

  it("keeps card and weekly preview aligned for the same query view", () => {
    const query = {
      data: sydneyHeatRiskResponse(),
      isLoading: false,
      isFetching: false,
      isPlaceholderData: true,
      isError: false,
      errorReason: null,
      locationErrorCode: null,
    } as const;

    expect(resolveDashboardCardQueryState(query).status).toBe("loading");
    expect(resolveWeeklyPreviewSourceFromQuery(query).status).toBe("loading");
  });

  it("keeps card and weekly preview aligned after a failed refresh", () => {
    const query = {
      data: sydneyHeatRiskResponse(),
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: true,
      errorReason: "network" as const,
      locationErrorCode: null,
    };

    expect(resolveDashboardCardQueryState(query).status).toBe("fetch_error");
    expect(resolveWeeklyPreviewSourceFromQuery(query).status).toBe(
      "unavailable",
    );
  });

  it("returns location_error when forecast risk levels cannot be derived", () => {
    expect(resolveDashboardCardState(responseWithEmptyForecast())).toEqual({
      status: "location_error",
      errorCode: "risk_calculation_failed",
    });
  });

  it("returns location_error for unknown model inputs", () => {
    expect(
      resolveDashboardCardState(undefined, {
        isError: true,
        locationErrorCode: "unknown_inputs",
      }),
    ).toEqual({
      status: "location_error",
      errorCode: "unknown_inputs",
    });
  });

  it("maps derived-risk failures to dashboard card copy", () => {
    expect(toDashboardCardErrorI18nKey("risk_calculation_failed")).toBe(
      "dashboard.cardErrors.riskCalculationFailed",
    );
    expect(toDashboardCardErrorI18nKey("unknown_inputs")).toBe(
      "dashboard.cardErrors.unknownInputs",
    );
    expect(toDashboardCardErrorI18nKey(null)).toBe(
      "dashboard.cardErrors.generic",
    );
  });
});
