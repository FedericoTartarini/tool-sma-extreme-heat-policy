import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/apiErrors";
import {
  getDashboardHeatRiskApiResponseOrThrow,
  throwIfDashboardHeatRiskFetchFailed,
  toDashboardHeatRiskQueryFailure,
  toDashboardHeatRiskQueryErrorReason,
} from "@/api/dashboardHeatRiskQuery";
import { sydneyHeatRiskResponse } from "@/test/weeklyWindowFixtures";

describe("dashboardHeatRiskQuery helpers", () => {
  it("maps weather provider API errors to a stable fetch reason", () => {
    const failure = toDashboardHeatRiskQueryFailure(
      new ApiError({
        kind: "http_status",
        status: 502,
        serverCode: "weather_provider_unavailable",
        message: "weather_provider_unavailable",
      }),
    );

    expect(failure).toEqual({
      kind: "fetch",
      reason: "weather_provider_unavailable",
    });
  });

  it("maps unknown inputs to a dashboard location error", () => {
    expect(
      toDashboardHeatRiskQueryFailure(
        new ApiError({
          kind: "http_status",
          status: 422,
          serverCode: "unknown_inputs",
          message: "http_status",
        }),
      ),
    ).toEqual({
      kind: "location",
      errorCode: "unknown_inputs",
    });
  });

  it("maps other API errors to fetch failures", () => {
    expect(
      toDashboardHeatRiskQueryFailure(
        new ApiError({
          kind: "network",
          message: "network",
        }),
      ),
    ).toEqual({
      kind: "fetch",
      reason: "network",
    });
  });

  it("returns null for non-API errors", () => {
    expect(toDashboardHeatRiskQueryFailure(new Error("boom"))).toBeNull();
  });

  it("keeps fetch reason mapping available for legacy callers", () => {
    expect(
      toDashboardHeatRiskQueryErrorReason(
        new ApiError({
          kind: "network",
          message: "network",
        }),
      ),
    ).toBe("network");
  });

  it("throws unknown_inputs for 422 heat-risk fetch failures", () => {
    expect(() =>
      throwIfDashboardHeatRiskFetchFailed({
        ok: false,
        reason: "http_status",
        status: 422,
      }),
    ).toThrowError(
      expect.objectContaining({
        serverCode: "unknown_inputs",
      }),
    );
  });

  it("throws structured API errors for other failed heat-risk fetches", () => {
    expect(() =>
      throwIfDashboardHeatRiskFetchFailed({
        ok: false,
        reason: "missing_config",
      }),
    ).toThrowError(
      expect.objectContaining({
        kind: "missing_config",
      }),
    );
  });

  it("returns response data for successful heat-risk fetches", () => {
    const response = sydneyHeatRiskResponse();

    expect(
      getDashboardHeatRiskApiResponseOrThrow({ ok: true, data: response }),
    ).toBe(response);
  });
});
