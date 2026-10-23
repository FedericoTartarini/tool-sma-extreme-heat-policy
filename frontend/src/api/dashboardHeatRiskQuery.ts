import { ApiError, isApiError } from "@/api/apiErrors";
import type {
  HeatRiskApiResponse,
  HeatRiskApiResult,
  HeatRiskErrorReason,
} from "@/api/heatRisk";

export type DashboardHeatRiskLocationErrorCode = "unknown_inputs";

export type DashboardHeatRiskQueryFailure =
  | { kind: "fetch"; reason: HeatRiskErrorReason }
  | { kind: "location"; errorCode: DashboardHeatRiskLocationErrorCode };

/**
 * Maps a React Query dashboard heat-risk failure into fetch or location errors.
 */
export function toDashboardHeatRiskQueryFailure(
  error: unknown,
): DashboardHeatRiskQueryFailure | null {
  if (!isApiError(error)) {
    return null;
  }

  if (error.serverCode === "unknown_inputs") {
    return { kind: "location", errorCode: "unknown_inputs" };
  }

  const reason =
    error.serverCode === "weather_provider_unavailable"
      ? "weather_provider_unavailable"
      : error.kind;

  return { kind: "fetch", reason };
}

/**
 * @deprecated Use {@link toDashboardHeatRiskQueryFailure} for card state resolution.
 */
export function toDashboardHeatRiskQueryErrorReason(
  error: unknown,
): HeatRiskErrorReason | null {
  const failure = toDashboardHeatRiskQueryFailure(error);

  return failure?.kind === "fetch" ? failure.reason : null;
}

/**
 * Throws a structured API error when a heat-risk fetch did not succeed.
 */
export function throwIfDashboardHeatRiskFetchFailed(
  result: HeatRiskApiResult,
): asserts result is Extract<HeatRiskApiResult, { ok: true }> {
  if (result.ok) {
    return;
  }

  if (result.status === 422) {
    throw new ApiError({
      kind: "http_status",
      status: 422,
      serverCode: "unknown_inputs",
      message: result.reason,
    });
  }

  throw new ApiError({
    kind:
      result.reason === "weather_provider_unavailable"
        ? "http_status"
        : result.reason,
    status: result.status,
    serverCode:
      result.reason === "weather_provider_unavailable"
        ? "weather_provider_unavailable"
        : undefined,
    message: result.reason,
  });
}

/**
 * Returns validated heat-risk response data or throws a structured API error.
 */
export function getDashboardHeatRiskApiResponseOrThrow(
  result: HeatRiskApiResult,
): HeatRiskApiResponse {
  throwIfDashboardHeatRiskFetchFailed(result);

  return result.data;
}
