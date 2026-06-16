import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/apiErrors";
import {
  getRetryDelayMs,
  retryApiRequest,
  shouldRetryHeatRiskError,
  shouldRetryMapboxRetrieveError,
} from "@/api/apiRetryPolicy";
import { MapboxApiError } from "@/api/mapboxErrors";

function mapboxRetrieveError(params: {
  kind: "abort" | "http_status" | "invalid_response" | "network";
  status?: number;
}): MapboxApiError {
  return new MapboxApiError({
    endpoint: "retrieve",
    message: params.kind,
    ...params,
  });
}

function heatRiskError(params: {
  kind:
    | "abort"
    | "http_status"
    | "invalid_response"
    | "missing_config"
    | "network";
  status?: number;
}): ApiError {
  return new ApiError({
    message: params.kind,
    ...params,
  });
}

describe("api retry policy", () => {
  it("uses short fixed retry delays for each bounded retry scope", () => {
    expect(getRetryDelayMs({ scope: "mapbox_retrieve" })).toBe(400);
    expect(getRetryDelayMs({ scope: "heat_risk" })).toBe(500);
  });

  it("retries only transient Mapbox retrieve failures", () => {
    expect(
      shouldRetryMapboxRetrieveError(mapboxRetrieveError({ kind: "network" })),
    ).toBe(true);
    expect(
      shouldRetryMapboxRetrieveError(
        mapboxRetrieveError({ kind: "http_status", status: 429 }),
      ),
    ).toBe(true);
    expect(
      shouldRetryMapboxRetrieveError(
        mapboxRetrieveError({ kind: "http_status", status: 500 }),
      ),
    ).toBe(true);

    expect(
      shouldRetryMapboxRetrieveError(mapboxRetrieveError({ kind: "abort" })),
    ).toBe(false);
    expect(
      shouldRetryMapboxRetrieveError(
        mapboxRetrieveError({ kind: "invalid_response" }),
      ),
    ).toBe(false);
    expect(
      shouldRetryMapboxRetrieveError(
        mapboxRetrieveError({ kind: "http_status", status: 404 }),
      ),
    ).toBe(false);
  });

  it("retries only transient backend heat-risk failures", () => {
    expect(shouldRetryHeatRiskError(heatRiskError({ kind: "network" }))).toBe(
      true,
    );
    expect(
      shouldRetryHeatRiskError(
        heatRiskError({ kind: "http_status", status: 502 }),
      ),
    ).toBe(true);
    expect(
      shouldRetryHeatRiskError(
        heatRiskError({ kind: "http_status", status: 503 }),
      ),
    ).toBe(true);
    expect(
      shouldRetryHeatRiskError(
        heatRiskError({ kind: "http_status", status: 504 }),
      ),
    ).toBe(true);

    expect(shouldRetryHeatRiskError(heatRiskError({ kind: "abort" }))).toBe(
      false,
    );
    expect(
      shouldRetryHeatRiskError(heatRiskError({ kind: "invalid_response" })),
    ).toBe(false);
    expect(
      shouldRetryHeatRiskError(heatRiskError({ kind: "missing_config" })),
    ).toBe(false);
    expect(
      shouldRetryHeatRiskError(
        heatRiskError({ kind: "http_status", status: 429 }),
      ),
    ).toBe(false);
    expect(
      shouldRetryHeatRiskError(
        heatRiskError({ kind: "http_status", status: 422 }),
      ),
    ).toBe(false);
  });

  it("retries an operation once when the policy allows it", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", message: "bad" }))
      .mockResolvedValueOnce("ok");

    await expect(
      retryApiRequest(operation, {
        maxRetries: 1,
        delayMs: 0,
        shouldRetry: shouldRetryHeatRiskError,
      }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the continuation guard turns false", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", message: "bad" }));
    const canContinue = vi.fn(() => false);

    await expect(
      retryApiRequest(
        operation,
        {
          maxRetries: 1,
          delayMs: 0,
          shouldRetry: shouldRetryHeatRiskError,
        },
        { canContinue },
      ),
    ).rejects.toMatchObject({ kind: "network" });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
